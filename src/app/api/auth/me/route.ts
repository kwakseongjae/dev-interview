import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireUser();

    // admin으로 RLS 우회하여 deleted_at 포함 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user, error } = await (supabaseAdmin as any)
      .from("users")
      .select(
        "id, email, nickname, avatar_url, created_at, updated_at, deleted_at, is_admin",
      )
      .eq("id", auth.sub)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 탈퇴한 사용자: deleted 플래그 + 탈퇴일 반환 (개인 데이터 노출 없이)
    if (user.deleted_at) {
      return NextResponse.json({
        deleted: true,
        deleted_at: user.deleted_at,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
        is_admin: user.is_admin ?? false,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "사용자 정보 조회에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
