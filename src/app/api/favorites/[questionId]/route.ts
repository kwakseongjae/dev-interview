import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/favorites/:questionId - 찜 여부 확인
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { questionId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(questionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 질문 ID입니다" },
        { status: 400 },
      );
    }

    // 찜 여부 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: favorite } = await (supabaseAdmin as any)
      .from("favorites")
      .select("id")
      .eq("user_id", auth.sub)
      .eq("question_id", questionId)
      .maybeSingle();

    return NextResponse.json({
      is_favorited: !!favorite,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("찜 여부 확인 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "찜 여부를 확인할 수 없습니다" },
      { status: 500 },
    );
  }
}

// DELETE /api/favorites/:questionId - 찜 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { questionId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(questionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 질문 ID입니다" },
        { status: 400 },
      );
    }

    // 먼저 해당 찜의 ID를 가져옴 (team_space_favorites 삭제를 위해)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: favorite } = await (supabaseAdmin as any)
      .from("favorites")
      .select("id")
      .eq("user_id", auth.sub)
      .eq("question_id", questionId)
      .maybeSingle();

    if (favorite) {
      // 팀스페이스 공유 기록 먼저 삭제
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("team_space_favorites")
        .delete()
        .eq("favorite_id", favorite.id);
    }

    // 찜 삭제
    const { error } = await supabaseAdmin
      .from("favorites")
      .delete()
      .eq("user_id", auth.sub)
      .eq("question_id", questionId);

    if (error) {
      console.error("찜 취소 실패:", error);
      return NextResponse.json(
        { error: "찜 취소에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("찜 취소 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "찜 취소에 실패했습니다" },
      { status: 500 },
    );
  }
}
