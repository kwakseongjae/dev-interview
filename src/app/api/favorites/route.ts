import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/favorites - 찜한 질문 목록
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 찜한 질문 목록 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: favorites, error, count } = await (supabaseAdmin as any)
      .from("favorites")
      .select(
        `
        id,
        created_at,
        questions!inner(
          id,
          content,
          hint,
          favorite_count,
          categories!inner(name, display_name),
          subcategories(name, display_name)
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", auth.sub)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error("찜 목록 조회 실패");
    }

    // 각 질문별 내 답변 조회
    const favoritesWithAnswers = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (favorites || []).map(async (fav: any) => {
        const question = fav.questions as {
          id: string;
          content: string;
          hint: string | null;
          favorite_count: number;
          categories: { name: string; display_name: string };
          subcategories: { name: string; display_name: string } | null;
        };

        // 내 답변 중 가장 최근 것 조회
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: myAnswer } = await (supabaseAdmin as any)
          .from("answers")
          .select("id, content, ai_score")
          .eq("question_id", question.id)
          .eq("user_id", auth.sub)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          id: fav.id,
          question: {
            id: question.id,
            content: question.content,
            hint: question.hint,
            category: question.categories,
            subcategory: question.subcategories,
            favorite_count: question.favorite_count,
          },
          my_answer: myAnswer || null,
          created_at: fav.created_at,
        };
      })
    );

    return NextResponse.json({
      favorites: favoritesWithAnswers,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "찜 목록 조회에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/favorites - 질문 찜하기
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const body = await request.json();
    const { question_id } = body;

    if (!question_id) {
      return NextResponse.json(
        { error: "질문 ID는 필수입니다" },
        { status: 400 }
      );
    }

    // 이미 찜했는지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabaseAdmin as any)
      .from("favorites")
      .select("id")
      .eq("user_id", auth.sub)
      .eq("question_id", question_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 찜한 질문입니다" },
        { status: 409 }
      );
    }

    // 찜 추가
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: favorite, error } = await (supabaseAdmin as any)
      .from("favorites")
      .insert({
        user_id: auth.sub,
        question_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error("찜하기 실패");
    }

    return NextResponse.json(
      {
        id: favorite.id,
        question_id: favorite.question_id,
        created_at: favorite.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "찜하기에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
