import { supabaseAdmin } from "@/lib/supabase";
import type { QuestionGenerationHistoryInsert } from "@/types/database";
import {
  generateQuestionFingerprint,
  generateReferenceFingerprint,
} from "@/lib/fingerprint";

/**
 * 사용자의 질문 생성 이력 조회
 * - 최근 30일간 생성된 질문 내용 반환
 * - 레퍼런스 핑거프린트가 일치하는 질문 우선
 * @param userId 사용자 ID
 * @param referenceFingerprint 레퍼런스 핑거프린트 (선택)
 * @param limit 최대 반환 개수 (기본값: 100)
 * @returns 질문 내용 배열
 */
export async function getQuestionHistory(
  userId: string,
  referenceFingerprint?: string | null,
  limit: number = 100,
): Promise<string[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabaseAdmin as any)
      .from("question_generation_history")
      .select("question_content")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    // 레퍼런스 핑거프린트가 있으면 해당 레퍼런스로 생성된 질문 + 일반 질문 모두 조회
    // 레퍼런스 없이 생성된 질문도 제외 대상에 포함 (다양성 확보)

    const { data, error } = await query;

    if (error) {
      console.error("질문 이력 조회 실패:", error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => row.question_content);
  } catch (error) {
    console.error("질문 이력 조회 중 오류:", error);
    return [];
  }
}

/**
 * 특정 레퍼런스로 생성된 질문 이력만 조회
 * - 동일 레퍼런스로 생성된 질문만 반환
 * @param userId 사용자 ID
 * @param referenceFingerprint 레퍼런스 핑거프린트
 * @param limit 최대 반환 개수 (기본값: 50)
 * @returns 질문 내용 배열
 */
export async function getQuestionHistoryByReference(
  userId: string,
  referenceFingerprint: string,
  limit: number = 50,
): Promise<string[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("question_generation_history")
      .select("question_content")
      .eq("user_id", userId)
      .eq("reference_fingerprint", referenceFingerprint)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("레퍼런스별 질문 이력 조회 실패:", error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => row.question_content);
  } catch (error) {
    console.error("레퍼런스별 질문 이력 조회 중 오류:", error);
    return [];
  }
}

/**
 * 질문 생성 이력 저장
 * - 생성된 질문들을 이력 테이블에 저장
 * @param userId 사용자 ID
 * @param questions 생성된 질문 배열
 * @param referenceFingerprint 레퍼런스 핑거프린트 (선택)
 * @param interviewTypeId 면접 범주 ID (선택)
 * @param sessionId 세션 ID (선택)
 */
export async function saveQuestionHistory(
  userId: string,
  questions: Array<{ content: string }>,
  referenceFingerprint?: string | null,
  interviewTypeId?: string | null,
  sessionId?: string | null,
): Promise<void> {
  try {
    const historyRecords: QuestionGenerationHistoryInsert[] = questions.map(
      (q) => ({
        user_id: userId,
        question_content: q.content,
        question_fingerprint: generateQuestionFingerprint(q.content),
        reference_fingerprint: referenceFingerprint || null,
        interview_type_id: interviewTypeId || null,
        session_id: sessionId || null,
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("question_generation_history")
      .insert(historyRecords);

    if (error) {
      console.error("질문 이력 저장 실패:", error);
    }
  } catch (error) {
    console.error("질문 이력 저장 중 오류:", error);
    // 이력 저장 실패는 치명적이지 않으므로 throw하지 않음
  }
}

/**
 * 레퍼런스 텍스트로부터 핑거프린트 생성
 * - 외부에서 사용할 수 있도록 re-export
 */
export { generateReferenceFingerprint };

/**
 * 다양성 프롬프트 생성
 * - 이전 질문 이력을 기반으로 다양성 지시문 생성
 * @param previousQuestions 이전에 생성된 질문들
 * @returns 다양성 프롬프트 문자열
 */
export function buildDiversityPrompt(previousQuestions: string[]): string {
  if (previousQuestions.length === 0) {
    return "";
  }

  // 최대 30개의 이전 질문만 프롬프트에 포함 (토큰 절약)
  const questionsToInclude = previousQuestions.slice(0, 30);

  return `
## 질문 다양성 요구사항

### 제외할 질문 (이전에 출제됨)
다음 질문들과 **동일하거나 유사한 질문은 생성하지 마세요**.
핵심 키워드나 주제가 겹치는 질문도 피해주세요:

${questionsToInclude.map((q, i) => `${i + 1}. ${q}`).join("\n")}

### 다양성 지침
1. 위 질문들과 **다른 하위 주제** 선택
2. **다른 질문 유형** 사용:
   - 개념 설명 ("~란 무엇인가요?")
   - 비교 분석 ("A와 B의 차이점은?")
   - 상황 해결 ("~한 상황에서 어떻게?")
   - 경험 기반 ("~한 경험을 설명해주세요")
   - 트레이드오프 ("장단점을 비교해주세요")
3. **새로운 관점**이나 시나리오 제시
4. 이전에 다루지 않은 **세부 개념** 탐구

`;
}
