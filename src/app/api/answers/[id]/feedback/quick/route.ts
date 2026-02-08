import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateQuickFeedback,
  getModelInfo,
} from "@/lib/ai/feedback-generator";

/**
 * POST /api/answers/:id/feedback/quick - Generate quick feedback using Haiku
 * Creates or updates feedback with keywords, score, summary
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

    // Check for existing feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFeedback } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .select("id, keywords, quick_score, summary")
      .eq("answer_id", answerId)
      .single();

    // If quick feedback already exists, return it
    if (existingFeedback && existingFeedback.quick_score !== null) {
      return NextResponse.json({
        feedback: {
          id: existingFeedback.id,
          answerId,
          keywords: existingFeedback.keywords || [],
          score: existingFeedback.quick_score,
          summary: existingFeedback.summary,
          strengths: [],
          improvements: [],
          followUpQuestions: [],
          detailedFeedback: null,
          hasDetailedFeedback: false,
          createdAt: new Date().toISOString(),
          detailGeneratedAt: null,
        },
      });
    }

    const question = answer.questions as {
      id: string;
      content: string;
      hint: string | null;
      trend_topic: string | null;
    };

    // Generate quick feedback using Haiku
    const quickFeedback = await generateQuickFeedback(
      question.content,
      question.hint,
      answer.content,
      question.trend_topic || undefined,
    );

    const { quickModel } = getModelInfo();

    // Upsert feedback record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback, error: upsertError } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .upsert(
        {
          answer_id: answerId,
          keywords: quickFeedback.keywords,
          quick_score: quickFeedback.score,
          summary: quickFeedback.summary,
          pre_gen_model: quickModel,
          pre_gen_tokens:
            quickFeedback.inputTokens + quickFeedback.outputTokens,
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
        hasDetailedFeedback: !!feedback.detail_generated_at,
        createdAt: feedback.created_at,
        detailGeneratedAt: feedback.detail_generated_at,
      },
    });
  } catch (error) {
    console.error("퀵 피드백 생성 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "퀵 피드백 생성에 실패했습니다" },
      { status: 500 },
    );
  }
}
