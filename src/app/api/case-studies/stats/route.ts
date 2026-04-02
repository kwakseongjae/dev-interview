import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/case-studies";
import { supabaseAdmin } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// GET /api/case-studies/stats - 기업 사례 통계 (총 수, 회사 목록)
export async function GET() {
  try {
    // 총 published 케이스 스터디 수
    const { count } = await db
      .from("case_studies")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);

    // 회사 목록 (필터 옵션 재활용)
    const { companies } = await getFilterOptions();

    return NextResponse.json({
      totalCount: count ?? 0,
      companies,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "기업 사례 통계 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
