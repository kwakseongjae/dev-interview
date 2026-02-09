import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

// GET /api/team-spaces/:id - 팀스페이스 상세 정보
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();

    const { id: teamSpaceId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamSpaceId)) {
      return NextResponse.json(
        { error: "유효하지 않은 팀스페이스 ID입니다" },
        { status: 400 },
      );
    }

    // 팀스페이스 조회
    const { data: teamSpace, error } = await supabaseAdmin
      .from("team_spaces")
      .select("*")
      .eq("id", teamSpaceId)
      .single();

    if (error || !teamSpace) {
      return NextResponse.json(
        { error: "팀스페이스를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 멤버인지 확인
    const { data: membership } = await supabaseAdmin
      .from("team_space_members")
      .select("role")
      .eq("team_space_id", teamSpaceId)
      .eq("user_id", auth.sub)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "팀스페이스에 접근할 수 없습니다" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      teamSpace: {
        id: teamSpace.id,
        name: teamSpace.name,
        avatar_url: teamSpace.avatar_url,
        invite_code: teamSpace.invite_code,
        created_by: teamSpace.created_by,
        created_at: teamSpace.created_at,
        role: membership.role,
      },
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("팀스페이스 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "팀스페이스를 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}

// PATCH /api/team-spaces/:id - 팀스페이스 수정 (owner만)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();

    const { id: teamSpaceId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamSpaceId)) {
      return NextResponse.json(
        { error: "유효하지 않은 팀스페이스 ID입니다" },
        { status: 400 },
      );
    }
    const body = await request.json();
    let { name, avatar_url, password } = body;

    // 입력 검증 및 길이 제한
    if (name !== undefined) {
      name = name?.slice(0, 100) || null; // 최대 100자
      if (name && name.trim().length === 0) {
        return NextResponse.json(
          { error: "팀스페이스 이름은 필수입니다" },
          { status: 400 },
        );
      }
    }
    if (avatar_url !== undefined) {
      avatar_url = avatar_url?.slice(0, 500) || null; // 최대 500자 (URL 길이)
    }
    if (password !== undefined) {
      password = password?.slice(0, 128) || null; // 최대 128자
    }

    // owner 권한 확인
    const { data: membership } = await supabaseAdmin
      .from("team_space_members")
      .select("role")
      .eq("team_space_id", teamSpaceId)
      .eq("user_id", auth.sub)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "팀스페이스를 수정할 권한이 없습니다" },
        { status: 403 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: "팀스페이스 이름은 필수입니다" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url || null;
    }
    if (password !== undefined) {
      if (password && password.trim().length > 0) {
        updateData.password_hash = await hashPassword(password);
      } else {
        updateData.password_hash = null;
      }
    }
    updateData.updated_at = new Date().toISOString();

    const { data: teamSpace, error } = await supabaseAdmin
      .from("team_spaces")
      .update(updateData)
      .eq("id", teamSpaceId)
      .select()
      .single();

    if (error || !teamSpace) {
      throw new Error("팀스페이스 수정 실패");
    }

    return NextResponse.json({
      teamSpace: {
        id: teamSpace.id,
        name: teamSpace.name,
        avatar_url: teamSpace.avatar_url,
        invite_code: teamSpace.invite_code,
        created_at: teamSpace.created_at,
      },
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("팀스페이스 수정 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "팀스페이스 수정에 실패했습니다" },
      { status: 500 },
    );
  }
}
