import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/answers - 답변 저장
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const body = await request.json();
    const { session_id, question_id, content, time_spent, is_public } = body;

    // 입력 검증
    if (!session_id || !question_id || !content) {
      return NextResponse.json(
        { error: "세션 ID, 질문 ID, 답변 내용은 필수입니다" },
        { status: 400 }
      );
    }

    // 세션 소유권 확인
    const { data: session } = await supabaseAdmin
      .from("interview_sessions")
      .select("id")
      .eq("id", session_id)
      .eq("user_id", auth.sub)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 기존 답변 확인 (이미 있으면 업데이트)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingAnswer } = await (supabaseAdmin as any)
      .from("answers")
      .select("id")
      .eq("session_id", session_id)
      .eq("question_id", question_id)
      .eq("user_id", auth.sub)
      .single();

    let answer;

    if (existingAnswer) {
      // 기존 답변 업데이트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("answers")
        .update({
          content,
          time_spent: time_spent || 0,
          is_public: is_public ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAnswer.id)
        .select()
        .single();

      if (error) throw new Error("답변 업데이트 실패");
      answer = data;
    } else {
      // 새 답변 생성
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("answers")
        .insert({
          session_id,
          question_id,
          user_id: auth.sub,
          content,
          time_spent: time_spent || 0,
          is_public: is_public ?? false,
        })
        .select()
        .single();

      if (error) throw new Error("답변 저장 실패");
      answer = data;
    }

    return NextResponse.json(
      {
        id: answer.id,
        content: answer.content,
        time_spent: answer.time_spent,
        is_public: answer.is_public,
        created_at: answer.created_at,
      },
      { status: existingAnswer ? 200 : 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답변 저장에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
