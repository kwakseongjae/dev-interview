import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateFullFeedback,
  getModelInfo,
} from "@/lib/ai/feedback-generator";

/**
 * POST /api/answers/:id/feedback/full - Generate complete feedback in one call
 * Creates or returns feedback with all data: keyword analysis, score, summary,
 * strengths, improvements, followUpQuestions, detailedFeedback
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();

    const { id: answerId } = await params;

    // UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(answerId)) {
      return NextResponse.json(
        { error: "유효하지 않은 답변 ID입니다" },
        { status: 400 },
      );
    }

    // Get answer with question info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answer, error: answerError } = await (supabaseAdmin as any)
      .from("answers")
      .select(
        `
        id,
        content,
        user_id,
        questions!inner(id, content, hint, trend_topic)
      `,
      )
      .eq("id", answerId)
      .single();

    if (answerError || !answer) {
      return NextResponse.json(
        { error: "답변을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (answer.user_id !== auth.sub) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // Check for existing complete feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFeedback } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .select("*")
      .eq("answer_id", answerId)
      .single();

    // If full feedback already exists (has detailed feedback), return it
    if (existingFeedback && existingFeedback.detail_generated_at) {
      return NextResponse.json({
        feedback: {
          id: existingFeedback.id,
          answerId,
          keywords: existingFeedback.keywords || [],
          score: existingFeedback.quick_score,
          summary: existingFeedback.summary,
          strengths: existingFeedback.strengths || [],
          improvements: existingFeedback.improvements || [],
          followUpQuestions: existingFeedback.follow_up_questions || [],
          detailedFeedback: existingFeedback.detailed_feedback,
          hasDetailedFeedback: true,
          keywordAnalysis: {
            expected: existingFeedback.expected_keywords || [],
            mentioned: existingFeedback.mentioned_keywords || [],
            missing: existingFeedback.missing_keywords || [],
          },
          createdAt: existingFeedback.created_at,
          detailGeneratedAt: existingFeedback.detail_generated_at,
        },
      });
    }

    const question = answer.questions as {
      id: string;
      content: string;
      hint: string | null;
      trend_topic: string | null;
    };

    // Generate full feedback using Sonnet
    const fullFeedback = await generateFullFeedback(
      question.content,
      question.hint,
      answer.content,
      question.trend_topic || undefined,
    );

    const { detailModel } = getModelInfo();

    // Combine keywords for backward compatibility
    const allKeywords = [
      ...new Set([
        ...fullFeedback.keywordAnalysis.mentioned,
        ...fullFeedback.keywordAnalysis.expected,
      ]),
    ];

    // Upsert feedback record with all data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback, error: upsertError } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .upsert(
        {
          answer_id: answerId,
          keywords: allKeywords,
          quick_score: fullFeedback.score,
          summary: fullFeedback.summary,
          strengths: fullFeedback.strengths,
          improvements: fullFeedback.improvements,
          follow_up_questions: fullFeedback.followUpQuestions,
          detailed_feedback: fullFeedback.detailedFeedback,
          pre_gen_model: detailModel,
          detail_model: detailModel,
          pre_gen_tokens: fullFeedback.inputTokens + fullFeedback.outputTokens,
          detail_tokens: fullFeedback.inputTokens + fullFeedback.outputTokens,
          detail_generated_at: new Date().toISOString(),
          expected_keywords: fullFeedback.keywordAnalysis.expected,
          mentioned_keywords: fullFeedback.keywordAnalysis.mentioned,
          missing_keywords: fullFeedback.keywordAnalysis.missing,
        },
        { onConflict: "answer_id" },
      )
      .select()
      .single();

    if (upsertError) {
      console.error("피드백 저장 실패:", upsertError);
      return NextResponse.json(
        { error: "피드백 저장에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      feedback: {
        id: feedback.id,
        answerId: feedback.answer_id,
        keywords: feedback.keywords || [],
        score: feedback.quick_score,
        summary: feedback.summary,
        strengths: feedback.strengths || [],
        improvements: feedback.improvements || [],
        followUpQuestions: feedback.follow_up_questions || [],
        detailedFeedback: feedback.detailed_feedback,
        hasDetailedFeedback: true,
        keywordAnalysis: {
          expected: feedback.expected_keywords || [],
          mentioned: feedback.mentioned_keywords || [],
          missing: feedback.missing_keywords || [],
        },
        createdAt: feedback.created_at,
        detailGeneratedAt: feedback.detail_generated_at,
      },
    });
  } catch (error) {
    console.error("전체 피드백 생성 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "전체 피드백 생성에 실패했습니다" },
      { status: 500 },
    );
  }
}
