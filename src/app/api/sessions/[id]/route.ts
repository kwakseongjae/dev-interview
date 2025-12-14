import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/sessions/:id - 세션 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const sessionId = params.id;

    // 세션 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", auth.sub)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 세션의 질문들 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessionQuestions, error: sqError } = await (supabaseAdmin as any)
      .from("session_questions")
      .select(
        `
        question_order,
        questions!inner(
          id,
          content,
          hint,
          difficulty,
          categories!inner(name, display_name),
          subcategories(name, display_name)
        )
      `
      )
      .eq("session_id", sessionId)
      .order("question_order");

    if (sqError) {
      throw new Error("질문 조회 실패");
    }

    // 각 질문별 답변 조회
    const questionsWithAnswers = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sessionQuestions || []).map(async (sq: any) => {
        const question = sq.questions as {
          id: string;
          content: string;
          hint: string | null;
          difficulty: string;
          categories: { name: string; display_name: string };
          subcategories: { name: string; display_name: string } | null;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: answer } = await (supabaseAdmin as any)
          .from("answers")
          .select("id, content, time_spent, ai_score, ai_feedback, created_at")
          .eq("session_id", sessionId)
          .eq("question_id", question.id)
          .single();

        // 찜 여부 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: favorite } = await (supabaseAdmin as any)
          .from("favorites")
          .select("id")
          .eq("user_id", auth.sub)
          .eq("question_id", question.id)
          .single();

        return {
          id: question.id,
          content: question.content,
          hint: question.hint,
          difficulty: question.difficulty,
          category: question.categories,
          subcategory: question.subcategories,
          order: sq.question_order,
          answer: answer || null,
          is_favorited: !!favorite,
        };
      })
    );

    return NextResponse.json({
      id: session.id,
      query: session.query,
      total_time: session.total_time,
      is_completed: session.is_completed,
      questions: questionsWithAnswers,
      created_at: session.created_at,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "세션 조회에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/sessions/:id - 세션 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const sessionId = params.id;

    // 세션 소유권 확인 및 삭제
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", auth.sub);

    if (error) {
      throw new Error("세션 삭제 실패");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "세션 삭제에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
