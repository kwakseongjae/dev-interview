import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/favorites/answer - 찜한 질문에 답변 등록
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const body = await request.json();
    const { question_id, content, is_public } = body;

    if (!question_id || !content) {
      return NextResponse.json(
        { error: "질문 ID와 답변 내용은 필수입니다" },
        { status: 400 }
      );
    }

    // 찜한 질문인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: favorite } = await (supabaseAdmin as any)
      .from("favorites")
      .select("id")
      .eq("user_id", auth.sub)
      .eq("question_id", question_id)
      .single();

    if (!favorite) {
      return NextResponse.json(
        { error: "찜한 질문이 아닙니다" },
        { status: 404 }
      );
    }

    // 기존 답변 확인 (세션 없이 작성한 답변)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingAnswer } = await (supabaseAdmin as any)
      .from("answers")
      .select("id")
      .eq("question_id", question_id)
      .eq("user_id", auth.sub)
      .is("session_id", null)
      .single();

    let answer;

    if (existingAnswer) {
      // 기존 답변 업데이트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("answers")
        .update({
          content,
          is_public: is_public ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAnswer.id)
        .select()
        .single();

      if (error) throw new Error("답변 업데이트 실패");
      answer = data;
    } else {
      // 새 답변 생성 (session_id 없이)
      // 참고: session_id가 NOT NULL이면 이 기능은 별도 처리 필요
      // 여기서는 찜한 질문에 대한 독립적인 답변으로 처리

      // 임시 세션 생성 (찜 기반 답변용)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tempSession, error: sessionError } = await (supabaseAdmin as any)
        .from("interview_sessions")
        .insert({
          user_id: auth.sub,
          query: "찜한 질문 답변",
          is_completed: true,
        })
        .select("id")
        .single();

      if (sessionError || !tempSession) {
        throw new Error("답변 저장 실패");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("answers")
        .insert({
          session_id: tempSession.id,
          question_id,
          user_id: auth.sub,
          content,
          is_public: is_public ?? true,
        })
        .select()
        .single();

      if (error) throw new Error("답변 저장 실패");
      answer = data;
    }

    return NextResponse.json(
      {
        id: answer.id,
        question_id: answer.question_id,
        content: answer.content,
        is_public: answer.is_public,
        created_at: answer.created_at,
      },
      { status: existingAnswer ? 200 : 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답변 등록에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
