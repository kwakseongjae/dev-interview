import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();

    // 요청 본문 파싱 (탈퇴 사유)
    let reason: string | null = null;
    try {
      const body = await request.json();
      reason = body.reason?.slice(0, 500)?.trim() || null;
    } catch {
      // body가 없어도 진행
    }

    // 이미 탈퇴한 사용자인지 확인 (admin으로 RLS 우회)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user, error: userError } = await (supabaseAdmin as any)
      .from("users")
      .select("deleted_at")
      .eq("id", auth.sub)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (user.deleted_at) {
      return NextResponse.json(
        { error: "이미 탈퇴 처리된 계정입니다" },
        { status: 400 },
      );
    }

    // users 테이블 soft delete 처리
    // ban_duration 사용하지 않음 — 재가입 시 계정 복구 플로우 지원
    // RLS 정책이 deleted_at IS NULL 필터로 데이터 접근 차단
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabaseAdmin as any)
      .from("users")
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: reason,
      })
      .eq("id", auth.sub);

    if (updateError) {
      console.error("Failed to soft delete user:", updateError);
      return NextResponse.json(
        { error: "회원탈퇴 처리에 실패했습니다" },
        { status: 500 },
      );
    }

    // 서버 사이드 로그아웃
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // 로그아웃 실패해도 탈퇴는 완료된 상태
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    const message = error instanceof Error ? error.message : "";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "회원탈퇴 처리에 실패했습니다" },
      { status: 500 },
    );
  }
}
