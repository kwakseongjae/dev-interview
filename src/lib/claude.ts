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

다음 JSON 형식으로 응답해주세요:
{
  "questions": [
    {
      "content": "질문 내용",
      "hint": "답변 시 참고할 키워드 가이드 (예: 키워드1, 키워드2, 키워드3을 포함해보세요)",
      "category": "카테고리명",
      "subcategory": "소분류명"
    }
  ]
}

카테고리 예시: FRONTEND, BACKEND, DATABASE, NETWORK, CS, DEVOPS, ARCHITECTURE
소분류 예시: JAVASCRIPT, REACT, NODEJS, SQL, HTTP, DATA_STRUCTURE 등
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
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
}

/**
 * Claude API를 통해 면접 질문 생성
 * @param userPrompt - 사용자 검색 쿼리
 * @param excludeQuestions - 제외할 질문 내용 목록 (이미 추천된 질문들)
 * @param count - 생성할 질문 수 (기본값: 5)
 */
export async function generateQuestions(
  userPrompt: string,
  excludeQuestions: string[] = [],
  count: number = 5
): Promise<GeneratedQuestion[]> {
  // 제외할 질문이 있으면 프롬프트에 추가
  let excludeInstruction = "";
  if (excludeQuestions.length > 0) {
    excludeInstruction = `
다음 질문들과 유사하거나 중복되는 질문은 생성하지 마세요:
${excludeQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`;
  }

  const prompt = GENERATE_QUESTIONS_PROMPT.replace("{user_prompt}", userPrompt)
    .replace("{exclude_instruction}", excludeInstruction)
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
    return parsed.questions;
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
