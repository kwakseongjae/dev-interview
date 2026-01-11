import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type AnswerUpdate = Database["public"]["Tables"]["answers"]["Update"];

// GET /api/answers/:id - 답변 상세 조회
export async function GET(
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
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("답변 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "답변을 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}

// PATCH /api/answers/:id - 답변 수정
export async function PATCH(
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
    const body = await request.json();
    let { content, is_public } = body;

    // 입력 검증 및 길이 제한
    if (content !== undefined) {
      content = content?.slice(0, 10000) || null; // 최대 10000자
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { error: "답변 내용은 필수입니다" },
          { status: 400 }
        );
      }
    }
    if (is_public !== undefined) {
      is_public = Boolean(is_public); // boolean으로 강제 변환
    }

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
      console.error("답변 수정 실패:", error);
      return NextResponse.json(
        { error: "답변 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: answer.id,
      content: answer.content,
      is_public: answer.is_public,
      updated_at: answer.updated_at,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("답변 수정 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "답변 수정에 실패했습니다" },
      { status: 500 }
    );
  }
}
