import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { evaluateAnswer } from "@/lib/claude";

// POST /api/answers/:id/score - AI 답변 평가 요청
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { id: answerId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(answerId)) {
      return NextResponse.json(
        { error: "유효하지 않은 답변 ID입니다" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
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
      console.error("평가 결과 저장 실패:", updateError);
      return NextResponse.json(
        { error: "평가 결과 저장에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ai_score: evaluation.score,
      ai_feedback: evaluation.feedback,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("답변 평가 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    if (errorMessage.includes("권한이 없습니다")) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "답변 평가에 실패했습니다" },
      { status: 500 }
    );
  }
}
