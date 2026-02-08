import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH /api/sessions/:id/complete - 세션 완료 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();

    const { id: sessionId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 세션 ID입니다" },
        { status: 400 },
      );
    }
    const body = await request.json();
    let { total_time } = body;

    // 입력 검증
    if (total_time !== undefined) {
      total_time = Math.max(
        0,
        Math.min(86400, parseInt(String(total_time)) || 0),
      ); // 0-86400초(24시간) 범위로 제한
    }

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
        { status: 404 },
      );
    }

    // 세션 완료 처리
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .update({
        is_completed: true,
        total_time: total_time || 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !session) {
      console.error("세션 완료 처리 실패:", error);
      return NextResponse.json(
        { error: "세션 완료 처리에 실패했습니다" },
        { status: 500 },
      );
    }

    // 현재 선택된 팀 스페이스가 있으면 자동으로 공유 (아직 공유되지 않은 경우)
    const currentTeamSpaceId = request.headers.get("X-Current-Team-Space-Id");
    if (currentTeamSpaceId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(currentTeamSpaceId)) {
        // 멤버인지 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: membership } = await (supabaseAdmin as any)
          .from("team_space_members")
          .select("id")
          .eq("team_space_id", currentTeamSpaceId)
          .eq("user_id", auth.sub)
          .single();

        if (membership) {
          // 이미 공유된 세션인지 확인
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existing } = await (supabaseAdmin as any)
            .from("team_space_sessions")
            .select("id")
            .eq("team_space_id", currentTeamSpaceId)
            .eq("session_id", sessionId)
            .single();

          if (!existing) {
            // 자동 공유
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any).from("team_space_sessions").insert({
              team_space_id: currentTeamSpaceId,
              session_id: sessionId,
              shared_by: auth.sub,
              week_number: null, // 주차는 나중에 설정 가능
            });
          }
        }
      }
    }

    return NextResponse.json({
      id: session.id,
      is_completed: session.is_completed,
      total_time: session.total_time,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("세션 완료 처리 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "세션 완료 처리에 실패했습니다" },
      { status: 500 },
    );
  }
}
