import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/user/last-team-space - 마지막 선택한 팀스페이스 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();

    // 사용자 정보 조회 (last_selected_team_space_id 포함)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user, error } = await (supabaseAdmin as any)
      .from("users")
      .select("last_selected_team_space_id")
      .eq("id", auth.sub)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      lastSelectedTeamSpaceId: user.last_selected_team_space_id || null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "마지막 선택 팀스페이스 조회에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/user/last-team-space - 마지막 선택한 팀스페이스 저장
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireUser();

    const body = await request.json();
    const { teamSpaceId } = body;

    // teamSpaceId가 null이거나 유효한 문자열인지 확인
    const updateData: { last_selected_team_space_id: string | null } = {
      last_selected_team_space_id: teamSpaceId || null,
    };

    // 사용자 정보 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("users")
      .update(updateData)
      .eq("id", auth.sub);

    if (error) {
      throw new Error("마지막 선택 팀스페이스 저장 실패");
    }

    return NextResponse.json({
      success: true,
      lastSelectedTeamSpaceId: updateData.last_selected_team_space_id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "마지막 선택 팀스페이스 저장에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
