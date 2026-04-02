import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSttQuota } from "@/lib/stt/config";

/**
 * GET /api/transcribe/quota
 *
 * Returns the current user's STT usage quota status.
 * Response: { used: number, remaining: number, quota: number }
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const quota = await getSttQuota(user.id);
    if (!quota) {
      return NextResponse.json(
        { error: "쿼터 조회에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json(quota);
  } catch {
    return NextResponse.json(
      { error: "쿼터 조회에 실패했습니다" },
      { status: 500 },
    );
  }
}
