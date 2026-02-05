import Anthropic from "@anthropic-ai/sdk";
import type { InterviewTypeCode } from "@/types/interview";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 면접 범주별 특화 프롬프트
const INTERVIEW_TYPE_PROMPTS: Record<InterviewTypeCode, string> = {
  CS: `
🎯 면접 범주: CS 기초 (Computer Science Fundamentals)

이 범주의 질문은 다음 CS 기초 주제에 집중해야 합니다:
- 운영체제: 프로세스/스레드, 메모리 관리, 동기화, 데드락, 스케줄링
- 네트워크: TCP/IP, HTTP/HTTPS, REST, WebSocket, DNS, 로드밸런싱
- 알고리즘: 정렬, 탐색, 그래프 알고리즘, 동적 프로그래밍, 시간/공간 복잡도
- 자료구조: 배열, 연결 리스트, 스택, 큐, 트리, 해시 테이블, 그래프
- 데이터베이스: SQL, 인덱스, 정규화, 트랜잭션, ACID, 쿼리 최적화

질문 스타일:
- 이론적 개념을 명확히 설명할 수 있는지 확인하는 질문
- 개념의 장단점과 적용 상황을 이해하는지 묻는 질문
- 실제 예시와 연결하여 설명할 수 있는 질문
`,

  PROJECT: `
🎯 면접 범주: 프로젝트 기반 (Project-Based)

이 범주의 질문은 다음 프로젝트 경험 주제에 집중해야 합니다:
- 프로젝트 경험: 본인이 맡은 역할, 기여도, 결과물
- 기술 선택 이유: 왜 해당 기술 스택을 선택했는지, 대안은 무엇이었는지
- 트러블슈팅: 개발 중 겪은 문제와 해결 과정, 디버깅 방법
- 협업 경험: 팀원과의 커뮤니케이션, 코드 리뷰, 컨플릭트 해결
- 성과 및 개선: 성능 개선, 코드 품질 향상, 사용자 피드백 반영

질문 스타일:
- "~한 경험을 설명해주세요" 형태의 행동 기반 질문
- 구체적인 상황과 대처 방법을 물어보는 STAR 기법 질문
- 기술적 결정의 트레이드오프를 이해하는지 묻는 질문
`,

  SYSTEM_DESIGN: `
🎯 면접 범주: 시스템 설계 (System Design)

이 범주의 질문은 다음 시스템 설계 주제에 집중해야 합니다:
- 대용량 트래픽: 초당 수만~수백만 요청 처리, 트래픽 급증 대응
- 아키텍처 설계: 마이크로서비스, 이벤트 드리븐, CQRS, 서버리스
- 확장성: 수평/수직 확장, 샤딩, 파티셔닝, 캐싱 전략
- 가용성 및 안정성: 장애 대응, Circuit Breaker, 백업, 재해 복구
- 데이터 일관성: 분산 시스템에서의 일관성, CAP 이론, 최종 일관성

질문 스타일:
- "~서비스를 설계하세요" 형태의 시스템 설계 질문
- 규모와 제약 조건을 고려한 아키텍처 질문
- 트레이드오프와 병목점을 분석하는 질문
`,
};

// 질문 생성 프롬프트
const GENERATE_QUESTIONS_PROMPT = `
당신은 개발자 기술면접 전문가입니다.
사용자의 요청에 맞는 기술면접 질문 {question_count}개를 생성해주세요.

요청: {user_prompt}
{exclude_instruction}
{reference_instruction}

다음 JSON 형식으로 응답해주세요:
{
  "questions": [
    {
      "content": "질문 내용",
      "hint": "답변 시 참고할 키워드 가이드 (예: 키워드1, 키워드2, 키워드3을 포함해보세요)",
      "category": "카테고리명",
      "subcategory": "소분류명",
      "isReferenceBased": true 또는 false
    }
  ]
}

카테고리 예시: FRONTEND, BACKEND, DATABASE, NETWORK, CS, DEVOPS, ARCHITECTURE
소분류 예시: JAVASCRIPT, REACT, NODEJS, SQL, HTTP, DATA_STRUCTURE 등
isReferenceBased는 레퍼런스 기반으로 생성된 질문인 경우에만 true로 설정해주세요.
레퍼런스가 제공된 경우, 반드시 최소 1개 이상의 질문은 isReferenceBased를 true로 설정해야 합니다.
`;

// 답변 평가 프롬프트
const EVALUATE_ANSWER_PROMPT = `
당신은 기술면접 평가 전문가입니다.
다음 질문에 대한 답변을 평가해주세요.

질문: {question}
힌트: {hint}
답변: {answer}

평가 기준:
1. 정확성 (30%): 기술적으로 정확한 내용인가
2. 완성도 (25%): 핵심 개념을 충분히 설명했는가
3. 구조성 (20%): 논리적으로 잘 구성되었는가
4. 실무 연관성 (15%): 실제 업무와 연관지어 설명했는가
5. 커뮤니케이션 (10%): 명확하고 이해하기 쉽게 설명했는가

다음 JSON 형식으로 응답해주세요:
{
  "score": 8.5,
  "feedback": "상세한 피드백 내용"
}

score는 1.0 ~ 10.0 사이의 소수점 첫째자리까지의 숫자입니다.
`;

export interface GeneratedQuestion {
  content: string;
  hint: string;
  category: string;
  subcategory?: string;
  isReferenceBased?: boolean; // 레퍼런스 기반 질문 여부
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
}

// 레퍼런스 유효성 검증 결과
export interface ReferenceValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * 레퍼런스 내용이 기술면접 질문 생성에 적합한지 검증
 */
async function validateReferenceContent(
  referenceText: string,
): Promise<ReferenceValidationResult> {
  // 텍스트가 너무 짧으면 유효하지 않음
  if (referenceText.length < 100) {
    return {
      isValid: false,
      reason: "레퍼런스 내용이 너무 짧습니다.",
    };
  }

  // Claude를 사용해 레퍼런스 유효성 검증
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `다음 텍스트가 기술면접 질문 생성에 활용할 수 있는 유효한 자료인지 판단해주세요.
유효한 자료의 예: 이력서, 포트폴리오, 기술 문서, 프로젝트 설명, 기술 블로그 글 등
유효하지 않은 자료의 예: 일반적인 텍스트, 광고, 무관한 문서, 읽을 수 없는 내용 등

텍스트:
${referenceText.substring(0, 2000)}

다음 JSON 형식으로만 응답해주세요:
{"isValid": true 또는 false, "reason": "판단 이유 (한 문장)"}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return { isValid: false, reason: "검증 응답 형식 오류" };
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { isValid: true }; // 파싱 실패 시 기본적으로 유효하다고 판단
    }
    const result = JSON.parse(jsonMatch[0]);
    return {
      isValid: result.isValid === true,
      reason: result.reason,
    };
  } catch {
    return { isValid: true }; // 파싱 실패 시 기본적으로 유효하다고 판단
  }
}

/**
 * 레퍼런스 파일에서 텍스트 추출 (Claude Vision API 사용)
 */
export type SupportedMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

async function extractTextFromReference(
  referenceUrl: string,
  fileType: SupportedMediaType,
): Promise<string> {
  try {
    console.log("레퍼런스 파일 다운로드 시작:", { referenceUrl, fileType });
    // 파일 다운로드
    const fileResponse = await fetch(referenceUrl);
    if (!fileResponse.ok) {
      console.error("레퍼런스 파일 다운로드 실패:", {
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        url: referenceUrl,
      });
      throw new Error(
        `레퍼런스 파일을 불러올 수 없습니다: ${fileResponse.status} ${fileResponse.statusText}`,
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");
    console.log("레퍼런스 파일 다운로드 완료:", {
      size: fileBuffer.byteLength,
      base64Length: base64.length,
    });

    // Claude Vision API로 텍스트 추출
    console.log("Claude Vision API 호출 시작");

    // Create content block based on file type
    const contentBlock =
      fileType === "application/pdf"
        ? {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          }
        : {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: fileType as Exclude<
                SupportedMediaType,
                "application/pdf"
              >,
              data: base64,
            },
          };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 ${
                fileType === "application/pdf" ? "PDF 문서" : "이미지"
              }의 내용을 텍스트로 추출해주세요. 기술 문서, 이력서, 포트폴리오 등의 내용을 정확하게 추출해주세요.`,
            },
            contentBlock,
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("예상치 못한 응답 형식");
    }

    console.log("레퍼런스 텍스트 추출 완료:", {
      textLength: content.text.length,
      preview: content.text.substring(0, 100),
    });
    return content.text;
  } catch (error) {
    console.error("레퍼런스 텍스트 추출 실패:", {
      error,
      referenceUrl,
      fileType,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `레퍼런스 파일 처리에 실패했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// 질문 생성 결과 (레퍼런스 사용 여부 포함)
export interface GenerateQuestionsResult {
  questions: GeneratedQuestion[];
  referenceUsed: boolean;
  referenceMessage?: string; // 레퍼런스 미사용 시 사유
}

/**
 * Claude API를 통해 면접 질문 생성
 * @param userPrompt - 사용자 검색 쿼리
 * @param excludeQuestions - 제외할 질문 내용 목록 (이미 추천된 질문들)
 * @param count - 생성할 질문 수 (기본값: 5)
 * @param referenceUrls - 레퍼런스 파일 URL 목록 (선택사항)
 * @param interviewType - 면접 범주 (선택사항)
 */
export async function generateQuestions(
  userPrompt: string,
  excludeQuestions: string[] = [],
  count: number = 5,
  referenceUrls?: Array<{ url: string; type: SupportedMediaType }>,
  interviewType?: InterviewTypeCode,
): Promise<GenerateQuestionsResult> {
  // 제외할 질문이 있으면 프롬프트에 추가
  let excludeInstruction = "";
  if (excludeQuestions.length > 0) {
    excludeInstruction = `
다음 질문들과 유사하거나 중복되는 질문은 생성하지 마세요:
${excludeQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`;
  }

  // 레퍼런스가 있는 경우 처리
  let referenceInstruction = "";
  let referenceTexts: string[] = [];
  let allReferenceBased = false;
  let referenceUsed = false;
  let referenceMessage: string | undefined;

  if (referenceUrls && referenceUrls.length > 0) {
    console.log("레퍼런스 처리 시작:", {
      count: referenceUrls.length,
      urls: referenceUrls.map((ref) => ({ url: ref.url, type: ref.type })),
    });

    // 레퍼런스 파일에서 텍스트 추출
    referenceTexts = await Promise.all(
      referenceUrls.map((ref) => extractTextFromReference(ref.url, ref.type)),
    );
    console.log("레퍼런스 텍스트 추출 완료:", {
      count: referenceTexts.length,
      textLengths: referenceTexts.map((text) => text.length),
    });

    // 레퍼런스 유효성 검증
    const combinedReferenceText = referenceTexts.join("\n\n");
    const validation = await validateReferenceContent(combinedReferenceText);
    console.log("레퍼런스 유효성 검증 결과:", validation);

    if (!validation.isValid) {
      // 레퍼런스가 유효하지 않으면 사용하지 않음
      referenceUsed = false;
      referenceMessage = `첨부하신 자료가 기술면접 질문 생성에 적합하지 않아 레퍼런스로 활용하지 않았습니다. (${validation.reason || "이력서, 포트폴리오, 기술 문서 등을 첨부해주세요."})`;
      console.log("레퍼런스 미사용:", referenceMessage);
    } else {
      // 레퍼런스가 유효하면 사용
      referenceUsed = true;

      // 사용자 요청에서 "전부", "모두", "모든", "100%" 등의 키워드로 전부 레퍼런스 기반 요청 확인
      const userPromptLower = userPrompt.toLowerCase();
      allReferenceBased =
        userPromptLower.includes("전부") ||
        userPromptLower.includes("모두") ||
        userPromptLower.includes("모든") ||
        userPromptLower.includes("100%") ||
        userPromptLower.includes("모두 레퍼런스") ||
        userPromptLower.includes("전부 레퍼런스");

      // 최소 3개의 레퍼런스 기반 질문 생성 (5개 중 3개 = 60%)
      const referenceBasedCount = allReferenceBased
        ? count
        : Math.max(3, Math.ceil(count * 0.6));

      referenceInstruction = `
⚠️ 매우 중요: 레퍼런스 자료가 제공되었습니다. 반드시 다음 규칙을 엄격히 준수해야 합니다.

제공된 레퍼런스 자료(이력서, 포트폴리오, 기술 문서 등):
${referenceTexts.map((text, i) => `[레퍼런스 ${i + 1}]\n${text}`).join("\n\n")}

🔴 필수 규칙 (반드시 준수):
1. ${
        allReferenceBased
          ? "모든 질문 (5개 모두)"
          : `최소 ${referenceBasedCount}개의 질문`
      }은 반드시 레퍼런스 기반이어야 합니다 (isReferenceBased: true).

2. 레퍼런스 기반 질문의 조건:
   - 반드시 레퍼런스에 언급된 구체적인 프로젝트명, 회사명, 기술명, 경험을 질문 본문에 직접 포함해야 합니다.
   - 단순히 일반적인 기술 질문이 아니라, 레퍼런스의 구체적인 내용을 바탕으로 한 맞춤형 질문이어야 합니다.

3. 올바른 레퍼런스 기반 질문 예시:
   ✅ "이력서에 언급된 OO 프로젝트에서 React를 사용하셨는데, 해당 프로젝트에서 상태 관리는 어떻게 구현하셨나요?"
   ✅ "포트폴리오의 XX 서비스에서 발생했던 성능 이슈를 어떻게 해결하셨나요?"
   ✅ "경력 사항에 적힌 AWS 인프라 구축 경험에 대해 구체적으로 설명해주세요."

4. 잘못된 예시 (일반 질문 - isReferenceBased: false):
   ❌ "React의 생명주기에 대해 설명해주세요." (레퍼런스 내용 미포함)
   ❌ "JavaScript의 클로저란 무엇인가요?" (레퍼런스 내용 미포함)

${
  allReferenceBased
    ? "⚠️ 사용자가 모든 질문을 레퍼런스 기반으로 요청했으므로, 5개 모든 질문에 isReferenceBased: true를 설정해야 합니다."
    : `⚠️ 최소 ${referenceBasedCount}개의 질문은 반드시 레퍼런스 기반이어야 합니다!`
}
`;
    }
  }

  // 면접 범주별 특화 프롬프트 추가
  let interviewTypeInstruction = "";
  if (interviewType && INTERVIEW_TYPE_PROMPTS[interviewType]) {
    interviewTypeInstruction = INTERVIEW_TYPE_PROMPTS[interviewType];
  }

  const prompt = GENERATE_QUESTIONS_PROMPT.replace("{user_prompt}", userPrompt)
    .replace("{exclude_instruction}", excludeInstruction)
    .replace(
      "{reference_instruction}",
      interviewTypeInstruction + referenceInstruction,
    )
    .replace("{question_count}", count.toString());

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("예상치 못한 응답 형식");
  }

  try {
    // JSON 블록 추출 시도
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON 응답을 찾을 수 없습니다");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = parsed.questions as GeneratedQuestion[];

    // 레퍼런스가 제공되고 사용된 경우 검증
    if (referenceUrls && referenceUrls.length > 0 && referenceUsed) {
      const actualReferenceBasedCount = questions.filter(
        (q) => q.isReferenceBased === true,
      ).length;

      const expectedMin = allReferenceBased
        ? count
        : Math.max(3, Math.ceil(count * 0.6));

      if (actualReferenceBasedCount < expectedMin) {
        console.warn(
          `경고: 레퍼런스 기반 질문이 ${actualReferenceBasedCount}개로 기대치(${expectedMin}개)보다 적습니다.`,
        );
        // 레퍼런스 기반 질문이 부족하면 일반 질문을 레퍼런스 기반으로 표시
        // (실제로 레퍼런스가 있으므로 관련성이 있을 수 있음)
        let needMore = expectedMin - actualReferenceBasedCount;
        for (let i = 0; i < questions.length && needMore > 0; i++) {
          if (!questions[i].isReferenceBased) {
            questions[i].isReferenceBased = true;
            needMore--;
          }
        }
      }
    }

    return {
      questions,
      referenceUsed,
      referenceMessage,
    };
  } catch {
    throw new Error("질문 생성 응답 파싱 실패");
  }
}

/**
 * 긴 쿼리를 짧은 제목으로 요약
 * @param query - 원본 쿼리
 * @returns 20자 내외의 짧은 제목
 */
export async function summarizeQueryToTitle(query: string): Promise<string> {
  // 이미 짧은 쿼리는 그대로 반환
  if (query.length <= 30) {
    return query;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `다음 면접 준비 요청을 20자 내외의 짧고 명확한 제목으로 요약해주세요. 
핵심 키워드만 포함하고, "면접", "준비", "질문" 같은 일반적인 단어는 생략해도 됩니다.
제목만 출력하고 다른 설명은 하지 마세요.

요청: ${query}

제목:`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return query.slice(0, 30);
    }

    // 응답에서 제목 추출 (따옴표 제거)
    const title = content.text.trim().replace(/^["']|["']$/g, "");

    // 제목이 너무 길면 잘라서 반환
    if (title.length > 40) {
      return title.slice(0, 37) + "...";
    }

    return title;
  } catch (error) {
    console.error("제목 요약 실패:", error);
    // 실패 시 원본 쿼리를 잘라서 반환
    if (query.length > 30) {
      return query.slice(0, 27) + "...";
    }
    return query;
  }
}

/**
 * Claude API를 통해 답변 평가
 */
export async function evaluateAnswer(
  question: string,
  hint: string | null,
  answer: string,
): Promise<AnswerEvaluation> {
  const prompt = EVALUATE_ANSWER_PROMPT.replace("{question}", question)
    .replace("{hint}", hint || "힌트 없음")
    .replace("{answer}", answer);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("예상치 못한 응답 형식");
  }

  try {
    // JSON 블록 추출 시도
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON 응답을 찾을 수 없습니다");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 점수 범위 검증 및 보정
    let score = parseFloat(parsed.score);
    if (isNaN(score)) score = 5.0;
    if (score < 1.0) score = 1.0;
    if (score > 10.0) score = 10.0;

    return {
      score: Math.round(score * 10) / 10, // 소수점 첫째자리까지
      feedback: parsed.feedback || "피드백을 생성할 수 없습니다.",
    };
  } catch {
    // 파싱 실패 시 기본값 반환
    return {
      score: 5.0,
      feedback: "답변 평가 중 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}
