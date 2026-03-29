import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  try {
    // 1. 인증 확인 (getUser로 서버 사이드 검증)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 2. admin으로 deleted_at 확인 (RLS 우회)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from("users")
      .select("id, deleted_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 3. 실제로 탈퇴한 사용자인지 검증
    if (!profile.deleted_at) {
      return NextResponse.json(
        { error: "탈퇴 상태가 아닌 계정입니다" },
        { status: 400 },
      );
    }

    // 4. 15일 복구 기간 검증
    const deletedAt = new Date(profile.deleted_at);
    const now = new Date();
    const daysSinceDeletion = Math.floor(
      (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDeletion > 15) {
      return NextResponse.json(
        { error: "복구 가능 기간(15일)이 지났습니다" },
        { status: 410 },
      );
    }

    // 5. 계정 복구: deleted_at, deletion_reason 초기화
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabaseAdmin as any)
      .from("users")
      .update({
        deleted_at: null,
        deletion_reason: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to recover account:", updateError);
      return NextResponse.json(
        { error: "계정 복구에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account recovery error:", error);
    return NextResponse.json(
      { error: "계정 복구에 실패했습니다" },
      { status: 500 },
    );
  }
}
