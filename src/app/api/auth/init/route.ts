// Applied rules: async-parallel, server-serialization
import { NextRequest, NextResponse } from "next/server";
import { getUserOptional } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/auth/init - 인증 초기화 (유저 정보 + 팀스페이스 + 마지막 선택 팀스페이스)
export async function GET(_request: NextRequest) {
  try {
    const auth = await getUserOptional();

    // 미인증 사용자: 빈 응답
    if (!auth) {
      return NextResponse.json({
        user: null,
        teamSpaces: [],
        lastSelectedTeamSpaceId: null,
      });
    }

    // 3개 쿼리를 병렬 실행
    const [userResult, teamSpacesResult] = await Promise.all([
      // 1) 유저 정보 + last_selected_team_space_id (단일 쿼리로 통합)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from("users")
        .select(
          "id, nickname, avatar_url, is_admin, deleted_at, last_selected_team_space_id",
        )
        .eq("id", auth.sub)
        .single(),

      // 2) 팀스페이스 목록
      supabaseAdmin
        .from("team_space_members")
        .select(
          `
          team_space_id,
          role,
          joined_at,
          team_spaces!inner(
            id,
            name,
            avatar_url,
            created_by,
            created_at
          )
        `,
        )
        .eq("user_id", auth.sub)
        .order("joined_at", { ascending: false }),
    ]);

    // 유저 조회 실패 또는 탈퇴한 사용자
    if (userResult.error || !userResult.data) {
      return NextResponse.json({
        user: null,
        teamSpaces: [],
        lastSelectedTeamSpaceId: null,
      });
    }

    if (userResult.data.deleted_at) {
      return NextResponse.json({
        user: null,
        deleted: true,
        deleted_at: userResult.data.deleted_at,
        teamSpaces: [],
        lastSelectedTeamSpaceId: null,
      });
    }

    // 팀스페이스 매핑
    const teamSpaces = (teamSpacesResult.data || []).map(
      (m: {
        team_space_id: string;
        role: string;
        joined_at: string;
        team_spaces: {
          id: string;
          name: string;
          avatar_url: string | null;
          created_by: string;
          created_at: string;
        };
      }) => ({
        id: m.team_spaces.id,
        name: m.team_spaces.name,
        avatar_url: m.team_spaces.avatar_url,
        role: m.role,
        created_by: m.team_spaces.created_by,
        created_at: m.team_spaces.created_at,
        joined_at: m.joined_at,
      }),
    );

    return NextResponse.json({
      user: {
        nickname: userResult.data.nickname,
        is_admin: userResult.data.is_admin ?? false,
      },
      teamSpaces,
      lastSelectedTeamSpaceId:
        userResult.data.last_selected_team_space_id || null,
    });
  } catch (error) {
    console.error("Auth init failed:", error);
    return NextResponse.json(
      { error: "인증 초기화에 실패했습니다" },
      { status: 500 },
    );
  }
}
