import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/questions/:questionId/answers - 다른 사람 답변 둘러보기
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    ); // 최대 100개로 제한
    const sort = (
      searchParams.get("sort") === "recent" ? "recent" : "score"
    ) as "score" | "recent"; // 허용된 값만 사용
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
      console.error("답변 목록 조회 실패:", error);
      return NextResponse.json(
        { error: "답변 목록을 불러올 수 없습니다" },
        { status: 500 }
      );
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
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("답변 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "답변 목록을 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}
