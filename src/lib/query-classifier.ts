/**
 * Layer 2: Haiku 기반 쿼리 분류기
 *
 * 개발자 기술면접 쿼리인지 Haiku로 분류하여 비개발 쿼리를 차단합니다.
 * fail-open 패턴: 분류 실패 시 쿼리를 허용합니다.
 */
import Anthropic from "@anthropic-ai/sdk";

// ── Config ─────────────────────────────────────────────────────────

/** 이 값 이상의 confidence로 off-topic 판별 시 차단 */
export const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.7;

// ── Types ──────────────────────────────────────────────────────────

export interface ClassifierResult {
  isDevInterview: boolean;
  confidence: number; // 0.0 – 1.0
  reason: string;
}

// ── Tool Definition (structured output) ────────────────────────────

const CLASSIFIER_TOOL: Anthropic.Tool = {
  name: "classify_query",
  description:
    "Classify whether the user query is related to developer technical interview preparation.",
  input_schema: {
    type: "object" as const,
    properties: {
      isDevInterview: {
        type: "boolean",
        description:
          "true if the query is about developer/engineer technical interview preparation, CS fundamentals, coding questions, or tech stack Q&A",
      },
      confidence: {
        type: "number",
        description: "Confidence score between 0.0 and 1.0",
      },
      reason: {
        type: "string",
        description:
          "One-sentence reason in Korean (max 50 chars) explaining the classification",
      },
    },
    required: ["isDevInterview", "confidence", "reason"],
  },
};

// ── System Prompt ──────────────────────────────────────────────────

const CLASSIFIER_SYSTEM_PROMPT = `개발자 기술면접 서비스의 쿼리 분류기입니다. 쿼리가 소프트웨어 개발/엔지니어링/CS/IT 기술직 면접 질문 요청인지 판별하세요.

YES (isDevInterview=true):
- 기술면접 질문 (React, JS, Python, DB, OS, 네트워크, 알고리즘 등)
- CS 기초 개념 질문, 코딩 테스트/면접 준비
- 특정 기술 스택 면접 질문 요청
- 경력/포지션별 개발자 면접 준비

NO (isDevInterview=false):
- 비개발 직군 면접 (카페알바, 공무원, 승무원, 마케팅, 영업 등)
- 비기술 주제 (주가예측, 요리, 운세, 다이어트 등)
- 이력서/자소서/인성면접 작성
- 일반 대화, 잡담

Always use the classify_query tool.`;

// ── Singleton Client ───────────────────────────────────────────────

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ── Main Classifier Function ───────────────────────────────────────

async function classifyQuery(query: string): Promise<ClassifierResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20250315",
    max_tokens: 128,
    system: CLASSIFIER_SYSTEM_PROMPT,
    tools: [CLASSIFIER_TOOL],
    tool_choice: { type: "tool", name: "classify_query" },
    messages: [{ role: "user", content: query }],
  });

  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolBlock) {
    throw new Error("Classifier did not return tool_use block");
  }

  const input = toolBlock.input as {
    isDevInterview: boolean;
    confidence: number;
    reason: string;
  };

  return {
    isDevInterview: Boolean(input.isDevInterview),
    confidence: Math.max(0, Math.min(1, Number(input.confidence))),
    reason: String(input.reason).slice(0, 100),
  };
}

// ── Safe Wrapper (fail-open, with timeout) ─────────────────────────

const DEFAULT_ALLOW: ClassifierResult = {
  isDevInterview: true,
  confidence: 0,
  reason: "분류 건너뜀 (fallback)",
};

export async function safeClassifyQuery(
  query: string,
  timeoutMs: number = 3000,
): Promise<ClassifierResult> {
  if (!query || query.trim().length < 3) {
    return DEFAULT_ALLOW;
  }

  try {
    const result = await Promise.race([
      classifyQuery(query.trim().slice(0, 500)),
      new Promise<ClassifierResult>((_, reject) =>
        setTimeout(() => reject(new Error("Classifier timeout")), timeoutMs),
      ),
    ]);

    return result;
  } catch (error) {
    console.warn(
      "[query-classifier] Failed, using fallback:",
      error instanceof Error ? error.message : "unknown",
    );
    return DEFAULT_ALLOW;
  }
}
