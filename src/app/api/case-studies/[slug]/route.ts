import { NextRequest, NextResponse } from "next/server";
import {
  getCaseStudyBySlug,
  incrementViewCount,
  getCaseStudyFavoriteIds,
} from "@/lib/case-studies";
import { getUserOptional } from "@/lib/supabase/auth-helpers";

const VIEW_COOLDOWN_SECONDS = 600; // 같은 사례 재조회 시 10분간 카운트 안 함

// GET /api/case-studies/[slug] - 기업 사례 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const caseStudy = await getCaseStudyBySlug(slug);

    if (!caseStudy) {
      return NextResponse.json(
        { error: "기업 사례를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 조회수 중복 방지: 쿠키로 최근 조회 여부 체크
    const viewedCookie = request.cookies.get(`cs_viewed_${slug}`);
    const shouldCountView = !viewedCookie;

    if (shouldCountView) {
      incrementViewCount(caseStudy.id).catch(() => {});
    }

    // 로그인 사용자인 경우 즐겨찾기 상태 추가
    const auth = await getUserOptional();

    let isFavorite = false;
    if (auth?.sub) {
      const favoriteIds = await getCaseStudyFavoriteIds(auth.sub);
      isFavorite = favoriteIds.includes(caseStudy.id);
    }

    const response = NextResponse.json({
      caseStudy: { ...caseStudy, isFavorite },
    });

    // 조회 기록 쿠키 설정 (10분간 유지)
    if (shouldCountView) {
      response.cookies.set(`cs_viewed_${slug}`, "1", {
        maxAge: VIEW_COOLDOWN_SECONDS,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "기업 사례 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
