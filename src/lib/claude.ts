import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

/**
 * 레퍼런스 파일에서 텍스트 추출 (Claude Vision API 사용)
 */
export type SupportedMediaType = "application/pdf" | "image/jpeg" | "image/png" | "image/gif" | "image/webp";

async function extractTextFromReference(
  referenceUrl: string,
  fileType: SupportedMediaType
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
        `레퍼런스 파일을 불러올 수 없습니다: ${fileResponse.status} ${fileResponse.statusText}`
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
    const contentBlock = fileType === "application/pdf"
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
            media_type: fileType as Exclude<SupportedMediaType, "application/pdf">,
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
      }`
    );
  }
}

/**
 * Claude API를 통해 면접 질문 생성
 * @param userPrompt - 사용자 검색 쿼리
 * @param excludeQuestions - 제외할 질문 내용 목록 (이미 추천된 질문들)
 * @param count - 생성할 질문 수 (기본값: 5)
 * @param referenceUrls - 레퍼런스 파일 URL 목록 (선택사항)
 */
export async function generateQuestions(
  userPrompt: string,
  excludeQuestions: string[] = [],
  count: number = 5,
  referenceUrls?: Array<{ url: string; type: SupportedMediaType }>
): Promise<GeneratedQuestion[]> {
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

  if (referenceUrls && referenceUrls.length > 0) {
    console.log("레퍼런스 처리 시작:", {
      count: referenceUrls.length,
      urls: referenceUrls.map((ref) => ({ url: ref.url, type: ref.type })),
    });
    // 레퍼런스 파일에서 텍스트 추출
    referenceTexts = await Promise.all(
      referenceUrls.map((ref) => extractTextFromReference(ref.url, ref.type))
    );
    console.log("레퍼런스 텍스트 추출 완료:", {
      count: referenceTexts.length,
      textLengths: referenceTexts.map((text) => text.length),
    });

    // 사용자 요청에서 "전부", "모두", "모든", "100%" 등의 키워드로 전부 레퍼런스 기반 요청 확인
    const userPromptLower = userPrompt.toLowerCase();
    allReferenceBased =
      userPromptLower.includes("전부") ||
      userPromptLower.includes("모두") ||
      userPromptLower.includes("모든") ||
      userPromptLower.includes("100%") ||
      userPromptLower.includes("모두 레퍼런스") ||
      userPromptLower.includes("전부 레퍼런스");

    const referenceBasedCount = allReferenceBased
      ? count
      : Math.max(1, Math.floor(count * 0.4)); // 최소 1개, 기본적으로 40% 이상

    referenceInstruction = `
⚠️ 중요: 레퍼런스 자료가 제공되었습니다. 반드시 다음 규칙을 준수해야 합니다.

제공된 레퍼런스 자료(이력서, 포트폴리오, 기술 문서 등):
${referenceTexts.map((text, i) => `[레퍼런스 ${i + 1}]\n${text}`).join("\n\n")}

필수 규칙:
1. ${
      allReferenceBased
        ? "모든 질문"
        : `최소 ${referenceBasedCount}개 이상의 질문`
    }은 반드시 레퍼런스 기반이어야 합니다 (isReferenceBased: true).
2. 레퍼런스 기반 질문은 반드시 레퍼런스에 언급된 구체적인 프로젝트명, 회사명, 기술명, 경험을 질문 본문에 직접 포함해야 합니다.
   올바른 예시: 
   - "OO 프로젝트에서 배포 오류를 처리한 경험을 바탕으로, 배포 프로세스에서 발생할 수 있는 문제들을 어떻게 예방하고 해결할 수 있을까요?"
   - "레퍼런스에 언급된 React 프로젝트에서 성능 최적화를 진행하셨다고 하는데, 구체적으로 어떤 방법들을 사용하셨나요?"
   - "XX 회사에서 개발한 프로젝트에서 사용한 기술 스택을 바탕으로, 해당 기술들의 장단점을 설명해주세요."
   잘못된 예시 (일반적인 질문):
   - "React에서 useEffect의 의존성 배열에 대해 설명해주세요." (레퍼런스 내용을 포함하지 않음)
   - "JavaScript의 이벤트 루프가 어떻게 동작하는지 설명해주세요." (레퍼런스 내용을 포함하지 않음)
3. 레퍼런스에 언급된 구체적인 내용(프로젝트명, 기술 스택, 경험, 회사명 등)을 질문에 명시적으로 포함하여 레퍼런스와 강하게 결합된 질문을 생성해주세요.
4. 레퍼런스 기반 질문은 단순히 일반적인 질문이 아니라, 레퍼런스의 구체적인 내용을 바탕으로 한 맞춤형 질문이어야 합니다.
5. 레퍼런스 기반 질문이 아닌 경우에만 isReferenceBased를 false로 설정해주세요.

${
  allReferenceBased
    ? "⚠️ 사용자가 모든 질문을 레퍼런스 기반으로 요청했으므로, 모든 질문에 isReferenceBased: true를 설정해야 합니다."
    : ""
}
`;
  }

  const prompt = GENERATE_QUESTIONS_PROMPT.replace("{user_prompt}", userPrompt)
    .replace("{exclude_instruction}", excludeInstruction)
    .replace("{reference_instruction}", referenceInstruction)
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

    // 레퍼런스가 제공된 경우 검증: 최소 1개 이상의 레퍼런스 기반 질문이 있는지 확인
    if (referenceUrls && referenceUrls.length > 0) {
      const referenceBasedCount = questions.filter(
        (q) => q.isReferenceBased === true
      ).length;

      if (allReferenceBased && referenceBasedCount < count) {
        console.warn(
          `경고: 모든 질문이 레퍼런스 기반이어야 하는데 ${referenceBasedCount}/${count}개만 레퍼런스 기반입니다.`
        );
      } else if (!allReferenceBased && referenceBasedCount === 0) {
        console.warn(
          "경고: 레퍼런스가 제공되었지만 레퍼런스 기반 질문이 생성되지 않았습니다."
        );
        // 첫 번째 질문을 강제로 레퍼런스 기반으로 변경 시도
        if (questions.length > 0) {
          questions[0].isReferenceBased = true;
        }
      }
    }

    return questions;
  } catch {
    throw new Error("질문 생성 응답 파싱 실패");
  }
}

/**
 * Claude API를 통해 답변 평가
 */
export async function evaluateAnswer(
  question: string,
  hint: string | null,
  answer: string
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
