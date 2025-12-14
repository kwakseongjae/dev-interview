import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/questions/:id - 질문 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;

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
    const message =
      error instanceof Error ? error.message : "질문 조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
