import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateDetailedFeedback,
  generateQuickFeedback,
  getModelInfo,
} from "@/lib/ai/feedback-generator";

/**
 * POST /api/answers/:id/feedback/detail - Generate detailed feedback using Sonnet
 * Requires existing quick feedback (or generates it first)
 * Returns: strengths, improvements, followUpQuestions, detailedFeedback
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
        questions!inner(id, content, hint)
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
    let { data: existingFeedback } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .select("*")
      .eq("answer_id", answerId)
      .single();

    const question = answer.questions as {
      id: string;
      content: string;
      hint: string | null;
    };

    const { quickModel, detailModel } = getModelInfo();

    // If detailed feedback already exists, return it
    if (existingFeedback?.detail_generated_at) {
      return NextResponse.json({
        feedback: {
          id: existingFeedback.id,
          answerId: existingFeedback.answer_id,
          keywords: existingFeedback.keywords || [],
          score: existingFeedback.quick_score,
          summary: existingFeedback.summary,
          strengths: existingFeedback.strengths || [],
          improvements: existingFeedback.improvements || [],
          followUpQuestions: existingFeedback.follow_up_questions || [],
          detailedFeedback: existingFeedback.detailed_feedback,
          hasDetailedFeedback: true,
          createdAt: existingFeedback.created_at,
          detailGeneratedAt: existingFeedback.detail_generated_at,
        },
      });
    }

    // If no quick feedback exists, generate it first
    if (!existingFeedback || existingFeedback.quick_score === null) {
      const quickFeedback = await generateQuickFeedback(
        question.content,
        question.hint,
        answer.content,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created } = await (supabaseAdmin as any)
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

      existingFeedback = created;
    }

    // Generate detailed feedback using Sonnet
    const detailedFeedback = await generateDetailedFeedback(
      question.content,
      question.hint,
      answer.content,
      existingFeedback?.keywords || [],
      existingFeedback?.quick_score || 3,
    );

    // Update feedback with detailed analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback, error: updateError } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .update({
        strengths: detailedFeedback.strengths,
        improvements: detailedFeedback.improvements,
        follow_up_questions: detailedFeedback.followUpQuestions,
        detailed_feedback: detailedFeedback.detailedFeedback,
        detail_model: detailModel,
        detail_tokens:
          detailedFeedback.inputTokens + detailedFeedback.outputTokens,
        detail_generated_at: new Date().toISOString(),
      })
      .eq("answer_id", answerId)
      .select()
      .single();

    if (updateError) {
      console.error("상세 피드백 저장 실패:", updateError);
      return NextResponse.json(
        { error: "상세 피드백 저장에 실패했습니다" },
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
        createdAt: feedback.created_at,
        detailGeneratedAt: feedback.detail_generated_at,
      },
    });
  } catch (error) {
    console.error("상세 피드백 생성 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "상세 피드백 생성에 실패했습니다" },
      { status: 500 },
    );
  }
}
