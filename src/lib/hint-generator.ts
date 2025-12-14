import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "./supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GENERATE_HINT_PROMPT = `
당신은 개발자 기술면접 전문가입니다.
다음 기술면접 질문에 대해 답변할 때 포함하면 좋은 핵심 키워드들을 제시해주세요.

질문: {question}
카테고리: {category}
소분류: {subcategory}

다음 조건을 지켜주세요:
1. 4~6개의 핵심 키워드를 쉼표로 구분하여 나열
2. 키워드는 답변에 꼭 포함되어야 할 기술 용어나 개념
3. 마지막에 "를 포함해보세요"로 끝나는 문장 형태로 작성
4. 친근하고 도움이 되는 톤 유지

예시 응답:
"HTTP 메서드, 상태 코드, 리소스 네이밍, HATEOAS를 포함해보세요"
"Virtual DOM, Reconciliation, Diffing 알고리즘, 배치 업데이트를 포함해보세요"
"인덱스, 실행 계획, 정규화, 트랜잭션 격리 수준을 포함해보세요"

JSON 형식으로 응답해주세요:
{
  "hint": "키워드1, 키워드2, 키워드3, 키워드4를 포함해보세요"
}
`;

/**
 * 질문의 힌트를 조회하거나, 없으면 생성하여 반환
 */
export async function getOrGenerateHint(questionId: string): Promise<string> {
  // 1. 질문 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: question, error } = await (supabaseAdmin as any)
    .from("questions")
    .select(
      `
      id,
      content,
      hint,
      category_id,
      subcategory_id,
      categories!inner(name),
      subcategories(name)
    `
    )
    .eq("id", questionId)
    .single();

  if (error || !question) {
    throw new Error("질문을 찾을 수 없습니다.");
  }

  // 2. 힌트가 이미 존재하면 바로 반환 (AI 호출 최소화)
  if (question.hint && question.hint.trim() !== "") {
    return question.hint;
  }

  // 3. 힌트가 없으면 Claude API로 생성
  const categoryName = (question.categories as { name: string })?.name || "기타";
  const subcategoryName =
    (question.subcategories as { name: string } | null)?.name || "일반";

  const hint = await generateHintWithClaude(
    question.content,
    categoryName,
    subcategoryName
  );

  // 4. 생성된 힌트를 DB에 저장
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabaseAdmin as any)
    .from("questions")
    .update({ hint })
    .eq("id", questionId);

  if (updateError) {
    console.error("힌트 저장 실패:", updateError);
    // 저장 실패해도 생성된 힌트는 반환
  }

  return hint;
}

/**
 * Claude API를 통해 힌트 생성
 */
export async function generateHintWithClaude(
  questionContent: string,
  category: string,
  subcategory: string
): Promise<string> {
  const prompt = GENERATE_HINT_PROMPT.replace("{question}", questionContent)
    .replace("{category}", category)
    .replace("{subcategory}", subcategory);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // 응답 파싱
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("예상치 못한 응답 형식");
  }

  try {
    const parsed = JSON.parse(content.text);
    return parsed.hint;
  } catch {
    // JSON 파싱 실패 시 텍스트에서 직접 추출 시도
    const match = content.text.match(/"hint":\s*"([^"]+)"/);
    if (match) {
      return match[1];
    }
    // 기본 힌트 반환
    return "핵심 개념과 실제 사용 사례를 포함해보세요";
  }
}
