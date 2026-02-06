import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/case-studies";

// GET /api/case-studies/filters - 필터 옵션 조회 (회사, 도메인 목록)
export async function GET() {
  try {
    const options = await getFilterOptions();
    return NextResponse.json(options);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "필터 옵션 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
