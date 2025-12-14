import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// DELETE /api/favorites/:questionId - 찜 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const questionId = params.questionId;

    // 찜 삭제
    const { error } = await supabaseAdmin
      .from("favorites")
      .delete()
      .eq("user_id", auth.sub)
      .eq("question_id", questionId);

    if (error) {
      throw new Error("찜 취소 실패");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "찜 취소에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
