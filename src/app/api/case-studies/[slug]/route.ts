import { NextRequest, NextResponse } from "next/server";
import {
  getCaseStudyBySlug,
  incrementViewCount,
  getCaseStudyFavoriteIds,
} from "@/lib/case-studies";
import { getAuthFromRequest } from "@/lib/auth";

// GET /api/case-studies/[slug] - 케이스 스터디 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const caseStudy = await getCaseStudyBySlug(slug);

    if (!caseStudy) {
      return NextResponse.json(
        { error: "케이스 스터디를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 조회수 증가 (비동기, 에러 무시)
    incrementViewCount(caseStudy.id).catch(() => {});

    // 로그인 사용자인 경우 즐겨찾기 상태 추가
    const authHeader = request.headers.get("Authorization");
    const auth = getAuthFromRequest(authHeader);

    let isFavorite = false;
    if (auth?.sub) {
      const favoriteIds = await getCaseStudyFavoriteIds(auth.sub);
      isFavorite = favoriteIds.includes(caseStudy.id);
    }

    return NextResponse.json({
      caseStudy: { ...caseStudy, isFavorite },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "케이스 스터디 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
