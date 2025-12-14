import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH /api/sessions/:id/complete - 세션 완료 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const sessionId = params.id;
    const body = await request.json();
    const { total_time } = body;

    // 세션 소유권 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSession } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", auth.sub)
      .single();

    if (!existingSession) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 세션 완료 처리
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .update({
        is_completed: true,
        total_time: total_time || 0,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !session) {
      throw new Error("세션 완료 처리 실패");
    }

    return NextResponse.json({
      id: session.id,
      is_completed: session.is_completed,
      total_time: session.total_time,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "세션 완료 처리에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
