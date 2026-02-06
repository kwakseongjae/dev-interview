/**
 * Case Study data fetching functions
 * Server-side functions for querying case_studies table
 */

import { supabaseAdmin } from "@/lib/supabase";
import type {
  CaseStudy,
  CaseStudyListItem,
  CaseStudyFilters,
} from "@/types/case-study";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/**
 * 케이스 스터디 목록 조회 (필터링/정렬/페이지네이션)
 */
export async function getCaseStudies(
  filters: Partial<CaseStudyFilters> = {},
  page: number = 1,
  limit: number = 12,
): Promise<{
  caseStudies: CaseStudyListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  let query = db
    .from("case_studies")
    .select(
      "id, title, slug, company_name, company_slug, source_type, published_at, domains, technologies, difficulty, view_count, interview_count",
      { count: "exact" },
    )
    .eq("is_published", true);

  // 검색어 필터
  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`,
    );
  }

  // 회사 필터
  if (filters.companies && filters.companies.length > 0) {
    query = query.in("company_slug", filters.companies);
  }

  // 도메인 필터 (배열 overlap)
  if (filters.domains && filters.domains.length > 0) {
    query = query.overlaps("domains", filters.domains);
  }

  // 난이도 필터
  if (filters.difficulty && filters.difficulty.length > 0) {
    query = query.in("difficulty", filters.difficulty);
  }

  // 소스 타입 필터
  if (filters.sourceType && filters.sourceType.length > 0) {
    query = query.in("source_type", filters.sourceType);
  }

  // 정렬
  switch (filters.sort) {
    case "popular":
      query = query.order("view_count", { ascending: false });
      break;
    case "difficulty":
      query = query.order("difficulty", { ascending: true });
      break;
    case "recent":
    default:
      query = query.order("published_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`케이스 스터디 목록 조회 실패: ${error.message}`);
  }

  const caseStudies: CaseStudyListItem[] = (data || []).map(mapToListItem);
  const total = count || 0;

  return {
    caseStudies,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 케이스 스터디 상세 조회 (slug 기반)
 */
export async function getCaseStudyBySlug(
  slug: string,
): Promise<CaseStudy | null> {
  const { data, error } = await db
    .from("case_studies")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToCaseStudy(data);
}

/**
 * 케이스 스터디 상세 조회 (ID 기반)
 */
export async function getCaseStudyById(id: string): Promise<CaseStudy | null> {
  const { data, error } = await db
    .from("case_studies")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToCaseStudy(data);
}

/**
 * 조회수 증가
 */
export async function incrementViewCount(id: string): Promise<void> {
  const { error } = await db.rpc("increment_view_count", {
    case_study_id: id,
  });

  // RPC가 없으면 직접 업데이트
  if (error) {
    await db
      .from("case_studies")
      .update({ view_count: db.raw("view_count + 1") })
      .eq("id", id);
  }
}

/**
 * 면접 횟수 증가
 */
export async function incrementInterviewCount(id: string): Promise<void> {
  const { error } = await db.rpc("increment_interview_count", {
    case_study_id: id,
  });

  if (error) {
    await db
      .from("case_studies")
      .update({ interview_count: db.raw("interview_count + 1") })
      .eq("id", id);
  }
}

/**
 * 사용 가능한 필터 옵션 조회 (회사, 도메인 목록)
 */
export async function getFilterOptions(): Promise<{
  companies: { slug: string; name: string }[];
  domains: string[];
}> {
  // 회사 목록 (distinct)
  const { data: companyData } = await db
    .from("case_studies")
    .select("company_slug, company_name")
    .eq("is_published", true)
    .order("company_name");

  // 중복 제거
  const companiesMap = new Map<string, string>();
  for (const row of companyData || []) {
    if (!companiesMap.has(row.company_slug)) {
      companiesMap.set(row.company_slug, row.company_name);
    }
  }
  const companies = Array.from(companiesMap.entries()).map(([slug, name]) => ({
    slug,
    name,
  }));

  // 도메인 목록 (모든 케이스 스터디에서 수집)
  const { data: domainData } = await db
    .from("case_studies")
    .select("domains")
    .eq("is_published", true);

  const domainsSet = new Set<string>();
  for (const row of domainData || []) {
    if (Array.isArray(row.domains)) {
      for (const domain of row.domains) {
        domainsSet.add(domain);
      }
    }
  }
  const domains = Array.from(domainsSet).sort();

  return { companies, domains };
}

/**
 * 즐겨찾기 상태 조회 (로그인 사용자)
 */
export async function getCaseStudyFavoriteIds(
  userId: string,
): Promise<string[]> {
  const { data } = await db
    .from("case_study_favorites")
    .select("case_study_id")
    .eq("user_id", userId);

  return (data || []).map(
    (row: { case_study_id: string }) => row.case_study_id,
  );
}

/**
 * 즐겨찾기 토글
 */
export async function toggleCaseStudyFavorite(
  userId: string,
  caseStudyId: string,
): Promise<boolean> {
  // 현재 상태 확인
  const { data: existing } = await db
    .from("case_study_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("case_study_id", caseStudyId)
    .single();

  if (existing) {
    // 삭제
    await db
      .from("case_study_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("case_study_id", caseStudyId);
    return false;
  } else {
    // 추가
    await db.from("case_study_favorites").insert({
      user_id: userId,
      case_study_id: caseStudyId,
    });
    return true;
  }
}

// ============ Internal Helpers ============

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToListItem(row: any): CaseStudyListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    companyName: row.company_name,
    companySlug: row.company_slug,
    sourceType: row.source_type,
    publishedAt: row.published_at,
    domains: row.domains || [],
    technologies: row.technologies || [],
    difficulty: row.difficulty,
    viewCount: row.view_count || 0,
    interviewCount: row.interview_count || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToCaseStudy(row: any): CaseStudy {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    companyName: row.company_name,
    companyLogoUrl: row.company_logo_url,
    companySlug: row.company_slug,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    sourceLanguage: row.source_language,
    publishedAt: row.published_at,
    summary: row.summary || {
      background: "",
      challenge: "",
      solution: "",
      results: "",
      keyTakeaways: [],
    },
    domains: row.domains || [],
    technologies: row.technologies || [],
    difficulty: row.difficulty,
    seedQuestions: row.seed_questions || [],
    viewCount: row.view_count || 0,
    interviewCount: row.interview_count || 0,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
