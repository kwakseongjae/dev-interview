import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/questions/:questionId/answers - 다른 사람 답변 둘러보기
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sort = searchParams.get("sort") || "score"; // score | recent
    const offset = (page - 1) * limit;

    // 공개된 답변만 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from("answers")
      .select(
        `
        id,
        content,
        ai_score,
        created_at,
        users!inner(id, nickname, avatar_url)
      `,
        { count: "exact" }
      )
      .eq("question_id", questionId)
      .eq("is_public", true);

    // 정렬
    if (sort === "score") {
      query = query.order("ai_score", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: answers, error, count } = await query;

    if (error) {
      throw new Error("답변 목록 조회 실패");
    }

    // 응답 형식 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedAnswers = (answers || []).map((answer: any) => ({
      id: answer.id,
      content: answer.content,
      ai_score: answer.ai_score,
      user: answer.users,
      created_at: answer.created_at,
    }));

    return NextResponse.json({
      answers: formattedAnswers,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답변 목록 조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
