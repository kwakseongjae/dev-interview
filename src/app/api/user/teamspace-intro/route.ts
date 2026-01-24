import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET: 팀스페이스 인트로를 봤는지 확인
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user, error } = await (supabaseAdmin as any)
      .from("users")
      .select("has_seen_teamspace_intro")
      .eq("id", auth.sub)
      .single();

    if (error) {
      // 컬럼이 없는 경우 false 반환 (마이그레이션 전)
      if (error.code === "PGRST116" || error.message?.includes("column")) {
        return NextResponse.json({ hasSeenIntro: false });
      }
      throw error;
    }

    return NextResponse.json({
      hasSeenIntro: user?.has_seen_teamspace_intro ?? false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "확인에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 팀스페이스 인트로를 봤음으로 표시
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("users")
      .update({ has_seen_teamspace_intro: true })
      .eq("id", auth.sub);

    if (error) {
      // 컬럼이 없는 경우 무시 (마이그레이션 전)
      if (error.code === "PGRST116" || error.message?.includes("column")) {
        return NextResponse.json({ success: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "업데이트에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
