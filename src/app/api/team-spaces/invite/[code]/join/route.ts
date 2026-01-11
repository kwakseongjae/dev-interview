import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/auth";

// POST /api/team-spaces/invite/:code/join - 초대 코드로 팀스페이스 참여
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { code: inviteCode } = await params;

    // 초대 코드 형식 검증 (8자 영문+숫자)
    if (!inviteCode || !/^[A-Z0-9]{8}$/.test(inviteCode)) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { password } = body;

    // 팀스페이스 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teamSpace, error: findError } = await (supabaseAdmin as any)
      .from("team_spaces")
      .select("id, name, password_hash")
      .eq("invite_code", inviteCode)
      .single();

    if (findError || !teamSpace) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다" },
        { status: 404 }
      );
    }

    // 비밀번호 확인
    if (teamSpace.password_hash) {
      if (!password) {
        return NextResponse.json(
          { error: "비밀번호가 필요합니다" },
          { status: 400 }
        );
      }

      const isValidPassword = await verifyPassword(
        password,
        teamSpace.password_hash
      );
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "비밀번호가 올바르지 않습니다" },
          { status: 401 }
        );
      }
    }

    // 이미 멤버인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMember } = await (supabaseAdmin as any)
      .from("team_space_members")
      .select("id")
      .eq("team_space_id", teamSpace.id)
      .eq("user_id", auth.sub)
      .single();

    if (existingMember) {
      return NextResponse.json(
        {
          teamSpace: {
            id: teamSpace.id,
            name: teamSpace.name,
          },
          message: "이미 참여한 팀스페이스입니다",
        },
        { status: 200 }
      );
    }

    // 멤버 추가
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: memberError } = await (supabaseAdmin as any)
      .from("team_space_members")
      .insert({
        team_space_id: teamSpace.id,
        user_id: auth.sub,
        role: "member",
      });

    if (memberError) {
      throw new Error("팀스페이스 참여 실패");
    }

    return NextResponse.json(
      {
        teamSpace: {
          id: teamSpace.id,
          name: teamSpace.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("팀스페이스 참여 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "팀스페이스 참여에 실패했습니다" },
      { status: 500 }
    );
  }
}

