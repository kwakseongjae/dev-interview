import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/team-spaces/:id/regenerate-invite - 초대 코드 재생성 (owner만)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { id: teamSpaceId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamSpaceId)) {
      return NextResponse.json(
        { error: "유효하지 않은 팀스페이스 ID입니다" },
        { status: 400 }
      );
    }

    // owner 권한 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (supabaseAdmin as any)
      .from("team_space_members")
      .select("role")
      .eq("team_space_id", teamSpaceId)
      .eq("user_id", auth.sub)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "초대 코드를 재생성할 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 새 초대 코드 생성
    const generateInviteCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let newInviteCode: string = generateInviteCode();
    let isUnique = false;

    while (!isUnique) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabaseAdmin as any)
        .from("team_spaces")
        .select("id")
        .eq("invite_code", newInviteCode)
        .single();

      if (!existing) {
        isUnique = true;
      } else {
        newInviteCode = generateInviteCode();
      }
    }

    // 초대 코드 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teamSpace, error } = await (supabaseAdmin as any)
      .from("team_spaces")
      .update({
        invite_code: newInviteCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamSpaceId)
      .select("invite_code")
      .single();

    if (error || !teamSpace) {
      console.error("초대 코드 재생성 실패:", error);
      return NextResponse.json(
        { error: "초대 코드 재생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invite_code: teamSpace.invite_code,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("초대 코드 재생성 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "초대 코드 재생성에 실패했습니다" },
      { status: 500 }
    );
  }
}

