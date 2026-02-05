import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/answers/:id/feedback - Get existing feedback for an answer
 * Returns cached feedback if exists, null otherwise
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = getAuthFromRequest(authHeader);

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

    // Get existing feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback, error: feedbackError } = await (
      supabaseAdmin as any
    )
      .from("answer_feedback")
      .select("*")
      .eq("answer_id", answerId)
      .single();

    if (feedbackError && feedbackError.code !== "PGRST116") {
      // PGRST116 = no rows found (ok)
      console.error("피드백 조회 실패:", feedbackError);
      return NextResponse.json(
        { error: "피드백 조회에 실패했습니다" },
        { status: 500 },
      );
    }

    if (!feedback) {
      return NextResponse.json({ feedback: null });
    }

    // Transform to API response format
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
        keywordAnalysis: {
          expected: feedback.expected_keywords || [],
          mentioned: feedback.mentioned_keywords || [],
          missing: feedback.missing_keywords || [],
        },
        // Model answer fields
        modelAnswer: feedback.model_answer
          ? {
              modelAnswer: feedback.model_answer,
              keyPoints: feedback.model_answer_key_points || [],
              codeExample: feedback.model_answer_code_example,
            }
          : null,
        hasModelAnswer: !!feedback.model_answer,
        createdAt: feedback.created_at,
        detailGeneratedAt: feedback.detail_generated_at,
      },
    });
  } catch (error) {
    console.error("피드백 조회 실패:", error);
    return NextResponse.json(
      { error: "피드백 조회에 실패했습니다" },
      { status: 500 },
    );
  }
}
