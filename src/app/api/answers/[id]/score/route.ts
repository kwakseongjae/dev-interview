import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { evaluateAnswer } from "@/lib/claude";

// POST /api/answers/:id/score - AI 답변 평가 요청
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const answerId = params.id;

    // 답변 및 질문 정보 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answer, error: answerError } = await (supabaseAdmin as any)
      .from("answers")
      .select(
        `
        id,
        content,
        user_id,
        questions!inner(id, content, hint)
      `
      )
      .eq("id", answerId)
      .single();

    if (answerError || !answer) {
      return NextResponse.json(
        { error: "답변을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 소유권 확인
    if (answer.user_id !== auth.sub) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    const question = answer.questions as {
      id: string;
      content: string;
      hint: string | null;
    };

    // Claude API로 평가 요청
    const evaluation = await evaluateAnswer(
      question.content,
      question.hint,
      answer.content
    );

    // 평가 결과 저장
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabaseAdmin as any)
      .from("answers")
      .update({
        ai_score: evaluation.score,
        ai_feedback: evaluation.feedback,
        updated_at: new Date().toISOString(),
      })
      .eq("id", answerId);

    if (updateError) {
      throw new Error("평가 결과 저장 실패");
    }

    return NextResponse.json({
      ai_score: evaluation.score,
      ai_feedback: evaluation.feedback,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답변 평가에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (message.includes("권한이 없습니다")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
