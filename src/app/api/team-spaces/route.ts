import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

// GET /api/team-spaces - 내가 참여한 팀스페이스 목록
export async function GET(_request: NextRequest) {
  try {
    const auth = await requireUser();

    const { data: memberships, error } = await supabaseAdmin
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
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("팀스페이스 목록 조회 실패:", error);
      return NextResponse.json(
        { error: "팀스페이스 목록을 불러올 수 없습니다" },
        { status: 500 },
      );
    }

    const teamSpaces = (memberships || []).map(
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

    return NextResponse.json({ teamSpaces });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "팀스페이스 목록 조회에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/team-spaces - 새 팀스페이스 생성
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();

    const body = await request.json();
    let { name, avatar_url, password } = body;

    // 입력 검증 및 길이 제한
    name = name?.slice(0, 100)?.trim() || null; // 최대 100자
    avatar_url = avatar_url?.slice(0, 500) || null; // 최대 500자 (URL 길이)
    password = password?.slice(0, 128) || null; // 최대 128자

    if (!name || name.length === 0) {
      return NextResponse.json(
        { error: "팀스페이스 이름은 필수입니다" },
        { status: 400 },
      );
    }

    let passwordHash: string | null = null;
    if (password && password.trim().length > 0) {
      passwordHash = await hashPassword(password);
    }

    // 팀스페이스 생성
    const { data: teamSpace, error: createError } = await supabaseAdmin
      .from("team_spaces")
      .insert({
        name: name.trim(),
        avatar_url: avatar_url || null,
        password_hash: passwordHash,
        created_by: auth.sub,
      })
      .select()
      .single();

    if (createError || !teamSpace) {
      console.error("팀스페이스 생성 실패:", createError);
      return NextResponse.json(
        { error: "팀스페이스 생성에 실패했습니다" },
        { status: 500 },
      );
    }

    // 생성자를 owner로 추가
    const { error: memberError } = await supabaseAdmin
      .from("team_space_members")
      .insert({
        team_space_id: teamSpace.id,
        user_id: auth.sub,
        role: "owner",
      });

    if (memberError) {
      console.error("팀스페이스 멤버 추가 실패:", memberError);
      // 팀스페이스는 생성되었지만 멤버 추가 실패 - 롤백은 하지 않고 경고만
      console.warn(
        "팀스페이스는 생성되었지만 멤버 추가에 실패했습니다:",
        teamSpace.id,
      );
    }

    return NextResponse.json(
      {
        teamSpace: {
          id: teamSpace.id,
          name: teamSpace.name,
          avatar_url: teamSpace.avatar_url,
          invite_code: teamSpace.invite_code,
          created_at: teamSpace.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("팀스페이스 생성 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "팀스페이스 생성에 실패했습니다" },
      { status: 500 },
    );
  }
}
