import { NextRequest, NextResponse } from "next/server";
import { getCaseStudies, getCaseStudyFavoriteIds } from "@/lib/case-studies";
import { getUserOptional } from "@/lib/supabase/auth-helpers";

// GET /api/case-studies - 케이스 스터디 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 필터 파라미터 파싱
    const search = searchParams.get("search") || "";
    const companies =
      searchParams.get("companies")?.split(",").filter(Boolean) || [];
    const domains =
      searchParams.get("domains")?.split(",").filter(Boolean) || [];
    const difficulty =
      searchParams.get("difficulty")?.split(",").filter(Boolean) || [];
    const sourceType =
      searchParams.get("sourceType")?.split(",").filter(Boolean) || [];
    const sort =
      (searchParams.get("sort") as "recent" | "popular" | "difficulty") ||
      "recent";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const result = await getCaseStudies(
      { search, companies, domains, difficulty, sourceType, sort },
      page,
      Math.min(limit, 50), // 최대 50개
    );

    // 로그인 사용자인 경우 즐겨찾기 상태 추가
    const auth = await getUserOptional();

    if (auth?.sub) {
      const favoriteIds = await getCaseStudyFavoriteIds(auth.sub);
      const favoriteSet = new Set(favoriteIds);
      result.caseStudies = result.caseStudies.map((cs) => ({
        ...cs,
        isFavorite: favoriteSet.has(cs.id),
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "케이스 스터디 목록 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
