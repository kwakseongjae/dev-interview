import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH /api/sessions/:id/claim - 게스트 세션을 로그인 유저에게 귀속
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();
    const { id: sessionId } = await params;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 세션 ID입니다" },
        { status: 400 },
      );
    }

    // 게스트 세션(user_id IS NULL)인지 확인
    const { data: session } = await supabaseAdmin
      .from("interview_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 이미 다른 유저의 세션이면 거부
    if (session.user_id !== null) {
      return NextResponse.json(
        { error: "이미 귀속된 세션입니다" },
        { status: 409 },
      );
    }

    // 세션 user_id 업데이트 (Update 타입에 user_id가 없어 as any 사용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("interview_sessions")
      .update({ user_id: auth.sub })
      .eq("id", sessionId)
      .is("user_id", null);

    // 답변 user_id 업데이트 (Update 타입에 user_id가 없어 as any 사용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("answers")
      .update({ user_id: auth.sub })
      .eq("session_id", sessionId)
      .is("user_id", null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("세션 클레임 실패:", error);
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "세션 클레임에 실패했습니다" },
      { status: 500 },
    );
  }
}
