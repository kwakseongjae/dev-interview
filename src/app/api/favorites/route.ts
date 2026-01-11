import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/favorites - 찜한 질문 목록
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20"))
    ); // 최대 100개로 제한
    const offset = (page - 1) * limit;

    // 찜한 질문 목록 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {
      data: favorites,
      error,
      count,
    } = await (supabaseAdmin as any)
      .from("favorites")
      .select(
        `
        id,
        created_at,
        question_id,
        questions(
          id,
          content,
          hint,
          favorite_count,
          categories(name, display_name),
          subcategories(name, display_name)
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", auth.sub)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("찜 목록 조회 실패:", error);
      return NextResponse.json(
        { error: "찜 목록을 불러올 수 없습니다" },
        { status: 500 }
      );
    }

    // 찜한 질문이 없으면 빈 배열 반환
    if (!favorites || favorites.length === 0) {
      return NextResponse.json({
        favorites: [],
        total: 0,
        page,
        limit,
      });
    }

    // 각 질문별 내 답변 조회
    const favoritesWithAnswers = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (favorites || [])
        .filter((fav: any) => fav.questions !== null) // questions가 null인 경우 제외
        .map(async (fav: any) => {
          try {
            const question = fav.questions as {
              id: string;
              content: string;
              hint: string | null;
              favorite_count: number;
              categories: { name: string; display_name: string } | null;
              subcategories: { name: string; display_name: string } | null;
            } | null;

            // questions가 없으면 건너뛰기
            if (!question) {
              return null;
            }

            // 내 답변 중 가장 최근 것 조회 (없을 수도 있음)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: myAnswers, error: answerError } = await (
              supabaseAdmin as any
            )
              .from("answers")
              .select("id, content, ai_score")
              .eq("question_id", question.id)
              .eq("user_id", auth.sub)
              .order("created_at", { ascending: false })
              .limit(1);

            // 답변 조회 에러는 무시 (답변이 없을 수 있음)
            if (answerError) {
              console.error("답변 조회 실패:", answerError);
            }

            const myAnswer =
              myAnswers && myAnswers.length > 0 ? myAnswers[0] : null;

            return {
              id: fav.id,
              question_id: question.id,
              content: question.content,
              hint: question.hint,
              category: question.categories?.display_name || "",
              subcategory: question.subcategories?.display_name || null,
              difficulty: "MEDIUM",
              created_at: fav.created_at,
            };
          } catch (err) {
            console.error("찜한 질문 처리 중 오류:", err);
            // 개별 항목 처리 실패 시 null 반환하여 필터링
            return null;
          }
        })
    );

    // null 값 필터링 (처리 실패한 항목 제외)
    const validFavorites = favoritesWithAnswers.filter(
      (fav) => fav !== null
    ) as Array<{
      id: string;
      question_id: string;
      content: string;
      hint: string | null;
      category: string;
      subcategory: string | null;
      difficulty: string;
      created_at: string;
    }>;

    return NextResponse.json({
      favorites: validFavorites,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("찜 목록 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "찜 목록을 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}

// POST /api/favorites - 질문 찜하기
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const body = await request.json();
    const { question_id } = body;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!question_id || !uuidRegex.test(question_id)) {
      return NextResponse.json(
        { error: "유효하지 않은 질문 ID입니다" },
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
      .maybeSingle();

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
      console.error("찜하기 실패:", error);
      return NextResponse.json(
        { error: "찜하기에 실패했습니다" },
        { status: 500 }
      );
    }

    // 현재 선택된 팀 스페이스가 있으면 자동으로 공유
    const currentTeamSpaceId = request.headers.get("X-Current-Team-Space-Id");
    if (currentTeamSpaceId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(currentTeamSpaceId)) {
        // 멤버인지 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: membership } = await (supabaseAdmin as any)
          .from("team_space_members")
          .select("id")
          .eq("team_space_id", currentTeamSpaceId)
          .eq("user_id", auth.sub)
          .single();

        if (membership) {
          // 이미 공유된 찜한 질문인지 확인
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existing } = await (supabaseAdmin as any)
            .from("team_space_favorites")
            .select("id")
            .eq("team_space_id", currentTeamSpaceId)
            .eq("favorite_id", favorite.id)
            .single();

          if (!existing) {
            // 자동 공유
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any).from("team_space_favorites").insert({
              team_space_id: currentTeamSpaceId,
              favorite_id: favorite.id,
              shared_by: auth.sub,
            });
          }
        }
      }
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
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("찜하기 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "찜하기에 실패했습니다" },
      { status: 500 }
    );
  }
}
