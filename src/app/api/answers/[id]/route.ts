import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type AnswerUpdate = Database["public"]["Tables"]["answers"]["Update"];

// GET /api/answers/:id - 답변 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const answerId = params.id;

    const { data: answer, error } = await supabaseAdmin
      .from("answers")
      .select(
        `
        id,
        content,
        time_spent,
        ai_score,
        ai_feedback,
        is_public,
        created_at,
        updated_at,
        questions!inner(id, content, hint)
      `
      )
      .eq("id", answerId)
      .eq("user_id", auth.sub)
      .single();

    if (error || !answer) {
      return NextResponse.json(
        { error: "답변을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답변 조회에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/answers/:id - 답변 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const answerId = params.id;
    const body = await request.json();
    const { content, is_public } = body;

    // 소유권 확인
    const { data: existingAnswer } = await supabaseAdmin
      .from("answers")
      .select("id")
      .eq("id", answerId)
      .eq("user_id", auth.sub)
      .single();

    if (!existingAnswer) {
      return NextResponse.json(
        { error: "답변을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 업데이트할 필드만 포함
    const updateData: AnswerUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updateData.content = content;
    if (is_public !== undefined) updateData.is_public = is_public;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answer, error } = await (supabaseAdmin as any)
      .from("answers")
      .update(updateData)
      .eq("id", answerId)
      .select()
      .single();

    if (error || !answer) {
      throw new Error("답변 수정 실패");
    }

    return NextResponse.json({
      id: answer.id,
      content: answer.content,
      is_public: answer.is_public,
      updated_at: answer.updated_at,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답변 수정에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
