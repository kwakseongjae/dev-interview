import { NextRequest, NextResponse } from "next/server";
import { generateQuestions, type SupportedMediaType } from "@/lib/claude";
import { validateInterviewInput } from "@/lib/validation";
import { getUserOptional } from "@/lib/supabase/auth-helpers";
import {
  getQuestionHistory,
  getQuestionHistoryByReference,
  saveQuestionHistory,
  generateReferenceFingerprint,
  buildDiversityPrompt,
} from "@/lib/question-history";
import type { InterviewTypeCode } from "@/types/interview";

// POST /api/questions/generate - Claude로 질문 생성 (세션 저장 없이)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      exclude_questions,
      count,
      reference_urls,
      interview_type,
      trend_topic,
    }: {
      query: string;
      exclude_questions?: string[];
      count?: number;
      reference_urls?: Array<{ url: string; type: SupportedMediaType }>;
      interview_type?: InterviewTypeCode;
      trend_topic?: string;
    } = body;

    // 입력 검증 - 빈 쿼리
    if (!query) {
      return NextResponse.json(
        { error: "검색 쿼리는 필수입니다" },
        { status: 400 },
      );
    }

    // 입력 유효성 검증 (토큰 절약을 위한 사전 검증)
    const validation = validateInterviewInput(query);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "invalid_input",
          validation_error: true,
          category: validation.category,
          suggestion: validation.suggestion,
        },
        { status: 422 }, // Unprocessable Entity
      );
    }

    // 선택적 인증 - 로그인 사용자는 질문 이력 기반 다양성 적용
    const auth = await getUserOptional();
    const userId = auth?.sub;

    // 제외할 질문 내용 목록 (이미 추천된 질문들)
    let excludeQuestions: string[] = exclude_questions || [];

    // 생성할 질문 수 (기본값: 5)
    const questionCount: number = count || 5;

    // 다양성 프롬프트 및 레퍼런스 핑거프린트 초기화
    let diversityPrompt = "";
    let referenceFingerprint: string | null = null;

    console.log("질문 생성 요청:", {
      query,
      excludeQuestionsCount: excludeQuestions.length,
      count: questionCount,
      referenceUrlsCount: reference_urls?.length || 0,
      referenceUrls: reference_urls,
      interviewType: interview_type,
      trendTopic: trend_topic,
      hasUser: !!userId,
    });

    // Claude로 질문 생성 (레퍼런스 URL, 면접 범주, 트렌드 토픽 포함)
    const result = await generateQuestions(
      query,
      excludeQuestions,
      questionCount,
      reference_urls,
      interview_type,
      diversityPrompt,
      trend_topic,
    );

    // 레퍼런스 핑거프린트 생성 (레퍼런스가 사용된 경우)
    if (result.referenceUsed && result.extractedReferenceText) {
      referenceFingerprint = generateReferenceFingerprint(
        result.extractedReferenceText,
      );
      console.log("레퍼런스 핑거프린트 생성:", {
        fingerprint: referenceFingerprint,
        textLength: result.extractedReferenceText.length,
      });
    }

    // 로그인 사용자의 경우: 이전 질문 이력 조회 후 다양성 적용
    if (userId) {
      // 이력 조회 (레퍼런스 핑거프린트 기반 + 전체 이력)
      let previousQuestions: string[] = [];

      if (referenceFingerprint) {
        // 동일 레퍼런스로 생성된 질문 우선 조회
        const referenceHistory = await getQuestionHistoryByReference(
          userId,
          referenceFingerprint,
          50,
        );
        previousQuestions = referenceHistory;

        console.log("레퍼런스 기반 이력 조회:", {
          referenceFingerprint,
          historyCount: referenceHistory.length,
        });
      }

      // 전체 이력도 병합 (중복 제거)
      const allHistory = await getQuestionHistory(userId, null, 100);
      const mergedHistory = [
        ...new Set([...previousQuestions, ...allHistory]),
      ].slice(0, 100);

      if (mergedHistory.length > 0) {
        // 다양성 프롬프트 생성
        diversityPrompt = buildDiversityPrompt(mergedHistory);

        // 기존 exclude_questions와 병합
        excludeQuestions = [
          ...new Set([...excludeQuestions, ...mergedHistory.slice(0, 50)]),
        ];

        console.log("다양성 적용:", {
          previousQuestionsCount: mergedHistory.length,
          totalExcludeCount: excludeQuestions.length,
          diversityPromptLength: diversityPrompt.length,
        });

        // 다양성 프롬프트를 포함하여 재생성
        const diverseResult = await generateQuestions(
          query,
          excludeQuestions,
          questionCount,
          reference_urls,
          interview_type,
          diversityPrompt,
          trend_topic,
        );

        // 질문 이력 저장 (비동기, 에러 무시)
        saveQuestionHistory(
          userId,
          diverseResult.questions,
          referenceFingerprint,
          interview_type ? await getInterviewTypeId(interview_type) : undefined,
        ).catch((err) => {
          console.error("질문 이력 저장 실패 (무시됨):", err);
        });

        console.log("생성된 질문 (다양성 적용):", {
          count: diverseResult.questions.length,
          referenceBasedCount: diverseResult.questions.filter(
            (q) => q.isReferenceBased,
          ).length,
          referenceUsed: diverseResult.referenceUsed,
          diversityApplied: true,
        });

        return NextResponse.json({
          questions: diverseResult.questions,
          query,
          referenceUsed: diverseResult.referenceUsed,
          referenceMessage: diverseResult.referenceMessage,
          diversityApplied: true,
        });
      }

      // 이력이 없는 경우에도 이력 저장
      saveQuestionHistory(
        userId,
        result.questions,
        referenceFingerprint,
        interview_type ? await getInterviewTypeId(interview_type) : undefined,
      ).catch((err) => {
        console.error("질문 이력 저장 실패 (무시됨):", err);
      });
    }

    console.log("생성된 질문:", {
      count: result.questions.length,
      referenceBasedCount: result.questions.filter((q) => q.isReferenceBased)
        .length,
      referenceUsed: result.referenceUsed,
      referenceMessage: result.referenceMessage,
      diversityApplied: false,
    });

    return NextResponse.json({
      questions: result.questions,
      query,
      referenceUsed: result.referenceUsed,
      referenceMessage: result.referenceMessage,
      diversityApplied: !!userId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "질문 생성에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 면접 범주 코드로 ID 조회 (캐시 가능)
async function getInterviewTypeId(
  code: InterviewTypeCode,
): Promise<string | undefined> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("interview_types")
      .select("id")
      .eq("code", code)
      .single();
    return data?.id;
  } catch {
    return undefined;
  }
}
