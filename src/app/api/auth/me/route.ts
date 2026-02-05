import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    // 사용자 정보 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user, error } = await (supabaseAdmin as any)
      .from("users")
      .select("id, email, nickname, avatar_url, created_at, updated_at")
      .eq("id", auth.sub)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
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
