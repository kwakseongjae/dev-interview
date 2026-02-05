/**
 * AI Feedback Generator
 * Uses Haiku for quick feedback (cost-optimized), Sonnet for detailed analysis
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  QUICK_FEEDBACK_PROMPT,
  DETAILED_FEEDBACK_PROMPT,
  FULL_FEEDBACK_PROMPT,
  MODEL_ANSWER_PROMPT,
  fillPromptTemplate,
} from "./feedback-prompts";
import type {
  QuickFeedbackData,
  DetailedFeedbackData,
  KeywordAnalysis,
  FullFeedbackData,
  ModelAnswerData,
} from "@/types/interview";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configuration
const HAIKU_MODEL = "claude-3-5-haiku-20241022";
const SONNET_MODEL = "claude-sonnet-4-20250514";

/**
 * Parse JSON from Claude response, handling markdown code blocks
 */
function parseJsonResponse<T>(text: string): T {
  // Try to extract JSON from code block first
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : text;

  // Find the JSON object
  const objectMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    throw new Error("JSON 응답을 찾을 수 없습니다");
  }

  return JSON.parse(objectMatch[0]);
}

/**
 * Generate quick feedback using Haiku model
 * Returns: keywords, score (1-5), summary
 * Cost: ~$0.0001-0.0002 per request
 */
export async function generateQuickFeedback(
  question: string,
  hint: string | null,
  answer: string,
): Promise<QuickFeedbackData & { inputTokens: number; outputTokens: number }> {
  const prompt = fillPromptTemplate(QUICK_FEEDBACK_PROMPT, {
    question,
    hint: hint || "힌트 없음",
    answer: answer || "(답변 없음)",
  });

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 256,
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
    const parsed = parseJsonResponse<{
      keywords: string[];
      score: number;
      summary: string;
    }>(content.text);

    // Validate and normalize
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.slice(0, 5)
      : [];
    let score = typeof parsed.score === "number" ? parsed.score : 3;
    score = Math.max(1, Math.min(5, Math.round(score)));
    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary.slice(0, 100)
        : "평가 생성됨";

    return {
      keywords,
      score,
      summary,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch {
    // Fallback on parse error
    return {
      keywords: [],
      score: 3,
      summary: "피드백 생성 중 오류가 발생했습니다",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

/**
 * Generate detailed feedback using Sonnet model
 * Returns: strengths, improvements, followUpQuestions, detailedFeedback
 * Cost: ~$0.003-0.006 per request
 */
export async function generateDetailedFeedback(
  question: string,
  hint: string | null,
  answer: string,
  existingKeywords: string[],
  existingScore: number,
): Promise<
  DetailedFeedbackData & { inputTokens: number; outputTokens: number }
> {
  const prompt = fillPromptTemplate(DETAILED_FEEDBACK_PROMPT, {
    question,
    hint: hint || "힌트 없음",
    answer: answer || "(답변 없음)",
    keywords: existingKeywords,
    score: existingScore,
  });

  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
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
    const parsed = parseJsonResponse<{
      strengths: string[];
      improvements: string[];
      followUpQuestions: string[];
      detailedFeedback: string;
    }>(content.text);

    // Validate and normalize
    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.slice(0, 3)
      : [];
    const improvements = Array.isArray(parsed.improvements)
      ? parsed.improvements.slice(0, 3)
      : [];
    const followUpQuestions = Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.slice(0, 3)
      : [];
    const detailedFeedback =
      typeof parsed.detailedFeedback === "string"
        ? parsed.detailedFeedback.slice(0, 500)
        : "상세 피드백을 생성할 수 없습니다.";

    return {
      strengths,
      improvements,
      followUpQuestions,
      detailedFeedback,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch {
    // Fallback on parse error
    return {
      strengths: [],
      improvements: ["답변을 더 구체적으로 작성해보세요"],
      followUpQuestions: [],
      detailedFeedback: "상세 피드백 생성 중 오류가 발생했습니다.",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

/**
 * Generate full feedback using Sonnet model (one-click complete analysis)
 * Returns everything: keywordAnalysis, score, summary, strengths, improvements, followUpQuestions, detailedFeedback
 * Cost: ~$0.005-0.010 per request
 */
export async function generateFullFeedback(
  question: string,
  hint: string | null,
  answer: string,
): Promise<FullFeedbackData & { inputTokens: number; outputTokens: number }> {
  const prompt = fillPromptTemplate(FULL_FEEDBACK_PROMPT, {
    question,
    hint: hint || "힌트 없음",
    answer: answer || "(답변 없음)",
  });

  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 1500,
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
    const parsed = parseJsonResponse<{
      keywordAnalysis: KeywordAnalysis;
      score: number;
      summary: string;
      strengths: string[];
      improvements: string[];
      followUpQuestions: string[];
      detailedFeedback: string;
    }>(content.text);

    // Validate and normalize keyword analysis
    const keywordAnalysis: KeywordAnalysis = {
      expected: Array.isArray(parsed.keywordAnalysis?.expected)
        ? parsed.keywordAnalysis.expected.slice(0, 6)
        : [],
      mentioned: Array.isArray(parsed.keywordAnalysis?.mentioned)
        ? parsed.keywordAnalysis.mentioned.slice(0, 6)
        : [],
      missing: Array.isArray(parsed.keywordAnalysis?.missing)
        ? parsed.keywordAnalysis.missing.slice(0, 6)
        : [],
    };

    // Normalize score
    let score = typeof parsed.score === "number" ? parsed.score : 3;
    score = Math.max(1, Math.min(5, Math.round(score)));

    // Normalize other fields
    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary.slice(0, 100)
        : "평가 생성됨";
    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.slice(0, 3)
      : [];
    const improvements = Array.isArray(parsed.improvements)
      ? parsed.improvements.slice(0, 3)
      : [];
    const followUpQuestions = Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.slice(0, 3)
      : [];
    const detailedFeedback =
      typeof parsed.detailedFeedback === "string"
        ? parsed.detailedFeedback.slice(0, 500)
        : "종합 피드백을 생성할 수 없습니다.";

    return {
      keywordAnalysis,
      score,
      summary,
      strengths,
      improvements,
      followUpQuestions,
      detailedFeedback,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch {
    // Fallback on parse error
    return {
      keywordAnalysis: {
        expected: [],
        mentioned: [],
        missing: [],
      },
      score: 3,
      summary: "피드백 생성 중 오류가 발생했습니다",
      strengths: [],
      improvements: ["답변을 더 구체적으로 작성해보세요"],
      followUpQuestions: [],
      detailedFeedback: "상세 피드백 생성 중 오류가 발생했습니다.",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

/**
 * Generate model answer using Sonnet model
 * Returns: exemplary answer, key points, optional code example
 * Cost: ~$0.003-0.006 per request
 */
export async function generateModelAnswer(
  question: string,
  hint: string | null,
  category: string,
): Promise<ModelAnswerData & { inputTokens: number; outputTokens: number }> {
  const prompt = fillPromptTemplate(MODEL_ANSWER_PROMPT, {
    question,
    hint: hint || "힌트 없음",
    category: category || "일반",
  });

  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
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
    const parsed = parseJsonResponse<{
      modelAnswer: string;
      keyPoints: string[];
      codeExample: string | null;
    }>(content.text);

    // Validate and normalize
    const modelAnswer =
      typeof parsed.modelAnswer === "string"
        ? parsed.modelAnswer.slice(0, 2000)
        : "모범 답변을 생성할 수 없습니다.";
    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.slice(0, 5)
      : [];
    const codeExample =
      typeof parsed.codeExample === "string" && parsed.codeExample.length > 0
        ? parsed.codeExample.slice(0, 1000)
        : null;

    return {
      modelAnswer,
      keyPoints,
      codeExample,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch {
    // Fallback on parse error
    return {
      modelAnswer: "모범 답변 생성 중 오류가 발생했습니다.",
      keyPoints: [],
      codeExample: null,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

/**
 * Get model names for tracking
 */
export function getModelInfo() {
  return {
    quickModel: HAIKU_MODEL,
    detailModel: SONNET_MODEL,
  };
}
