import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/questions/:id - 질문 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(questionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 질문 ID입니다" },
        { status: 400 }
      );
    }

    const { data: question, error } = await supabaseAdmin
      .from("questions")
      .select(
        `
        id,
        content,
        hint,
        difficulty,
        favorite_count,
        is_verified,
        created_at,
        categories!inner(id, name, display_name),
        subcategories(id, name, display_name)
      `
      )
      .eq("id", questionId)
      .single();

    if (error || !question) {
      return NextResponse.json(
        { error: "질문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("질문 조회 실패:", error);
    return NextResponse.json(
      { error: "질문을 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}
