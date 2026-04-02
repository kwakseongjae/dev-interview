import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRateLimitConfigs } from "@/lib/ratelimit";

// GET /api/admin/usage - API 사용량 조회 (Rate Limit 모니터링)
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dbUser } = await (supabaseAdmin as any)
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!dbUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(
      90,
      Math.max(1, parseInt(searchParams.get("days") || "7")),
    );

    // 최근 N일 사용량 조회
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usageData } = await (supabaseAdmin as any)
      .from("api_usage_daily")
      .select("*")
      .gte("day", startDateStr)
      .order("day", { ascending: false });

    const rows = usageData ?? [];

    // 일별 집계
    const dailyMap = new Map<
      string,
      { requests: number; tokens: number; costCents: number }
    >();
    for (const row of rows) {
      const existing = dailyMap.get(row.day) ?? {
        requests: 0,
        tokens: 0,
        costCents: 0,
      };
      existing.requests += row.request_count;
      existing.tokens += row.total_tokens;
      existing.costCents += row.estimated_cost_cents;
      dailyMap.set(row.day, existing);
    }

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([day, data]) => ({ day, ...data }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // 엔드포인트별 집계
    const endpointMap = new Map<
      string,
      { requests: number; tokens: number; costCents: number }
    >();
    for (const row of rows) {
      const ep = row.endpoint ?? "unknown";
      const existing = endpointMap.get(ep) ?? {
        requests: 0,
        tokens: 0,
        costCents: 0,
      };
      existing.requests += row.request_count;
      existing.tokens += row.total_tokens;
      existing.costCents += row.estimated_cost_cents;
      endpointMap.set(ep, existing);
    }

    const byEndpoint = Array.from(endpointMap.entries())
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.requests - a.requests);

    // 오늘 요약
    const todayStr = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });
    const todayData = dailyMap.get(todayStr) ?? {
      requests: 0,
      tokens: 0,
      costCents: 0,
    };

    // Rate Limit 설정
    const rateLimitConfigs = getRateLimitConfigs();

    return NextResponse.json({
      summary: {
        today: todayData,
        totalRequests: rows.reduce(
          (s: number, r: { request_count: number }) => s + r.request_count,
          0,
        ),
        totalTokens: rows.reduce(
          (s: number, r: { total_tokens: number }) => s + r.total_tokens,
          0,
        ),
        totalCostCents: rows.reduce(
          (s: number, r: { estimated_cost_cents: number }) =>
            s + r.estimated_cost_cents,
          0,
        ),
        dailyBudgetCents: 500,
        budgetUsagePercent: Math.round((todayData.costCents / 500) * 100),
      },
      dailyTrend,
      byEndpoint,
      rateLimitConfigs,
      period: { days, startDate: startDateStr },
    });
  } catch (error) {
    console.error("사용량 조회 실패:", error);
    return NextResponse.json(
      { error: "사용량 데이터를 조회할 수 없습니다" },
      { status: 500 },
    );
  }
}
