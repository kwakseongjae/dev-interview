import { NextRequest, NextResponse } from "next/server";
import { getUserOptional } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { generateModelAnswer, getModelInfo } from "@/lib/ai/feedback-generator";

/**
 * POST /api/answers/:id/model-answer - Generate model answer for a question
 * Returns: exemplary answer, key points, optional code example
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getUserOptional();

    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

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
        user_id,
        question_id,
        questions!inner (
          content,
          hint,
          trend_topic,
          categories!inner (
            display_name
          )
        )
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

    // Check if model answer already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFeedback } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .select(
        "id, model_answer, model_answer_key_points, model_answer_code_example",
      )
      .eq("answer_id", answerId)
      .single();

    if (existingFeedback?.model_answer) {
      // Return cached model answer
      return NextResponse.json({
        modelAnswer: {
          modelAnswer: existingFeedback.model_answer,
          keyPoints: existingFeedback.model_answer_key_points || [],
          codeExample: existingFeedback.model_answer_code_example,
        },
        cached: true,
      });
    }

    // Generate new model answer
    const question = answer.questions;
    const { modelAnswer, keyPoints, codeExample, inputTokens, outputTokens } =
      await generateModelAnswer(
        question.content,
        question.hint,
        question.categories?.display_name || "일반",
        question.trend_topic || undefined,
      );

    const { detailModel } = getModelInfo();

    // Save to database (upsert)
    if (existingFeedback) {
      // Update existing feedback record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("answer_feedback")
        .update({
          model_answer: modelAnswer,
          model_answer_key_points: keyPoints,
          model_answer_code_example: codeExample,
          model_answer_model: detailModel,
          model_answer_tokens: inputTokens + outputTokens,
          model_answer_generated_at: new Date().toISOString(),
        })
        .eq("id", existingFeedback.id);
    } else {
      // Create new feedback record with model answer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from("answer_feedback").insert({
        answer_id: answerId,
        model_answer: modelAnswer,
        model_answer_key_points: keyPoints,
        model_answer_code_example: codeExample,
        model_answer_model: detailModel,
        model_answer_tokens: inputTokens + outputTokens,
        model_answer_generated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      modelAnswer: {
        modelAnswer,
        keyPoints,
        codeExample,
      },
      cached: false,
    });
  } catch (error) {
    console.error("모범 답변 생성 실패:", error);
    return NextResponse.json(
      { error: "모범 답변 생성에 실패했습니다" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/answers/:id/model-answer - Get cached model answer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getUserOptional();

    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

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

    // Verify answer ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answer, error: answerError } = await (supabaseAdmin as any)
      .from("answers")
      .select("id, user_id")
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

    // Get cached model answer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback } = await (supabaseAdmin as any)
      .from("answer_feedback")
      .select(
        "model_answer, model_answer_key_points, model_answer_code_example",
      )
      .eq("answer_id", answerId)
      .single();

    if (!feedback?.model_answer) {
      return NextResponse.json({ modelAnswer: null });
    }

    return NextResponse.json({
      modelAnswer: {
        modelAnswer: feedback.model_answer,
        keyPoints: feedback.model_answer_key_points || [],
        codeExample: feedback.model_answer_code_example,
      },
    });
  } catch (error) {
    console.error("모범 답변 조회 실패:", error);
    return NextResponse.json(
      { error: "모범 답변 조회에 실패했습니다" },
      { status: 500 },
    );
  }
}
