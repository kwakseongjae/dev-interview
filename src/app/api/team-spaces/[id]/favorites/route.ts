import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/team-spaces/:id/favorites - 팀스페이스의 찜한 질문 목록
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
        { status: 400 },
      );
    }

    // 멤버인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (supabaseAdmin as any)
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

    // 팀스페이스의 찜한 질문 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sharedFavorites, error } = await (supabaseAdmin as any)
      .from("team_space_favorites")
      .select(
        `
        id,
        shared_at,
        shared_by,
        favorites!inner(
          id,
          question_id,
          created_at,
          questions!inner(
            id,
            content,
            hint,
            categories!inner(name, display_name),
            subcategories(name, display_name)
          )
        )
      `,
      )
      .eq("team_space_id", teamSpaceId)
      .order("shared_at", { ascending: false });

    if (error) {
      // 에러가 발생해도 빈 배열 반환 (찜한 질문이 없는 경우도 정상)
      return NextResponse.json({
        favorites: [],
      });
    }

    // 공유된 찜한 질문이 없으면 빈 배열 반환
    if (!sharedFavorites || sharedFavorites.length === 0) {
      return NextResponse.json({
        favorites: [],
      });
    }

    // 각 찜한 질문의 작성자 정보 조회
    const favoritesWithUsers = await Promise.all(
      sharedFavorites.map(async (sf: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user } = await (supabaseAdmin as any)
          .from("users")
          .select("id, username, nickname")
          .eq("id", sf.shared_by)
          .single();

        return {
          favorite_id: sf.favorites.id,
          question_id: sf.favorites.question_id,
          content: sf.favorites.questions.content,
          hint: sf.favorites.questions.hint,
          category: sf.favorites.questions.categories.display_name,
          subcategory:
            sf.favorites.questions.subcategories?.display_name || null,
          created_at: sf.favorites.created_at,
          shared_at: sf.shared_at,
          shared_by: {
            id: user?.id || sf.shared_by,
            username: user?.username || "",
            nickname: user?.nickname || null,
          },
          is_mine: sf.shared_by === auth.sub,
        };
      }),
    );

    // question_id로 그룹화하여 중복 제거 및 여러 사용자 정보 수집
    const favoritesMap = new Map<
      string,
      {
        question_id: string;
        content: string;
        hint: string | null;
        category: string;
        subcategory: string | null;
        created_at: string;
        favorited_by: Array<{
          id: string;
          username: string;
          nickname: string | null;
          shared_at: string;
          is_mine: boolean;
        }>;
        is_mine: boolean;
      }
    >();

    favoritesWithUsers.forEach((fav: any) => {
      const existing = favoritesMap.get(fav.question_id);
      if (existing) {
        // 이미 존재하는 질문이면 사용자 정보만 추가
        existing.favorited_by.push({
          id: fav.shared_by.id,
          username: fav.shared_by.username,
          nickname: fav.shared_by.nickname,
          shared_at: fav.shared_at,
          is_mine: fav.is_mine,
        });
        // is_mine이 true인 사용자가 있으면 전체 is_mine도 true
        if (fav.is_mine) {
          existing.is_mine = true;
        }
      } else {
        // 새로운 질문이면 추가
        favoritesMap.set(fav.question_id, {
          question_id: fav.question_id,
          content: fav.content,
          hint: fav.hint,
          category: fav.category,
          subcategory: fav.subcategory,
          created_at: fav.created_at,
          favorited_by: [
            {
              id: fav.shared_by.id,
              username: fav.shared_by.username,
              nickname: fav.shared_by.nickname,
              shared_at: fav.shared_at,
              is_mine: fav.is_mine,
            },
          ],
          is_mine: fav.is_mine,
        });
      }
    });

    // 각 question_id에 대해 현재 사용자가 찜한 favorite_id 확인
    // (favorited_by에 포함되어 있지만, 실제로는 favorites 테이블에서 확인)
    const questionIds = Array.from(favoritesMap.keys());
    const myFavorites = await Promise.all(
      questionIds.map(async (questionId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: favorite } = await (supabaseAdmin as any)
          .from("favorites")
          .select("id, question_id")
          .eq("question_id", questionId)
          .eq("user_id", auth.sub)
          .maybeSingle();
        return favorite ? questionId : null;
      }),
    );

    // 현재 사용자가 찜한 질문들의 is_mine 업데이트
    myFavorites.forEach((questionId) => {
      if (questionId) {
        const fav = favoritesMap.get(questionId);
        if (fav && !fav.is_mine) {
          fav.is_mine = true;
        }
      }
    });

    // Map을 배열로 변환하고 가장 최근 shared_at 기준으로 정렬
    const uniqueFavorites = Array.from(favoritesMap.values()).map((fav) => ({
      id: fav.question_id, // question_id를 id로 사용 (중복 제거된 항목)
      question_id: fav.question_id,
      content: fav.content,
      hint: fav.hint,
      category: fav.category,
      subcategory: fav.subcategory,
      created_at: fav.created_at,
      shared_at: fav.favorited_by.sort(
        (a, b) =>
          new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime(),
      )[0].shared_at, // 가장 최근 shared_at
      favorited_by: fav.favorited_by,
      is_mine: fav.is_mine,
    }));

    // shared_at 기준으로 정렬
    uniqueFavorites.sort(
      (a, b) =>
        new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime(),
    );

    return NextResponse.json({
      favorites: uniqueFavorites,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("찜한 질문 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "찜한 질문을 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}

// POST /api/team-spaces/:id/favorites - 찜한 질문을 팀스페이스에 공유
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
        { status: 400 },
      );
    }

    const body = await request.json();
    const { favorite_id } = body;

    // UUID 형식 검증
    if (!favorite_id || !uuidRegex.test(favorite_id)) {
      return NextResponse.json(
        { error: "유효하지 않은 찜한 질문 ID입니다" },
        { status: 400 },
      );
    }

    // 멤버인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (supabaseAdmin as any)
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

    // 찜한 질문 소유권 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: favorite } = await (supabaseAdmin as any)
      .from("favorites")
      .select("id")
      .eq("id", favorite_id)
      .eq("user_id", auth.sub)
      .single();

    if (!favorite) {
      return NextResponse.json(
        { error: "찜한 질문을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 이미 공유된 찜한 질문인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabaseAdmin as any)
      .from("team_space_favorites")
      .select("id")
      .eq("team_space_id", teamSpaceId)
      .eq("favorite_id", favorite_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 공유된 찜한 질문입니다" },
        { status: 409 },
      );
    }

    // 공유
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sharedFavorite, error } = await (supabaseAdmin as any)
      .from("team_space_favorites")
      .insert({
        team_space_id: teamSpaceId,
        favorite_id,
        shared_by: auth.sub,
      })
      .select()
      .single();

    if (error || !sharedFavorite) {
      console.error("찜한 질문 공유 실패:", error);
      return NextResponse.json(
        { error: "찜한 질문 공유에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        id: sharedFavorite.id,
        favorite_id: sharedFavorite.favorite_id,
        shared_at: sharedFavorite.shared_at,
      },
      { status: 201 },
    );
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("찜한 질문 공유 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "찜한 질문 공유에 실패했습니다" },
      { status: 500 },
    );
  }
}
