import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/team-spaces/invite/:code - 초대 코드로 팀스페이스 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: inviteCode } = await params;

    // 초대 코드 형식 검증 (8자 영문+숫자)
    if (!inviteCode || !/^[A-Z0-9]{8}$/.test(inviteCode)) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다" },
        { status: 400 },
      );
    }

    // 팀스페이스 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teamSpace, error } = await (supabaseAdmin as any)
      .from("team_spaces")
      .select("id, name, avatar_url, password_hash")
      .eq("invite_code", inviteCode)
      .single();

    if (error || !teamSpace) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      teamSpace: {
        id: teamSpace.id,
        name: teamSpace.name,
        avatar_url: teamSpace.avatar_url,
        has_password: !!teamSpace.password_hash,
      },
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("팀스페이스 조회 실패:", error);
    return NextResponse.json(
      { error: "팀스페이스를 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}
