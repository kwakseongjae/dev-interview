import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

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

    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!dbUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const errorType = searchParams.get("type") || "all";

    // 기간 필터
    let periodDate: string | null = null;
    if (period !== "all") {
      const days = period === "7d" ? 7 : 30;
      const date = new Date();
      date.setDate(date.getDate() - days);
      periodDate = date.toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    // 병렬 쿼리
    const [recentErrorsResult, errorTrendResult, errorTypeCountResult] =
      await Promise.all([
        // 최근 에러 로그 (최대 50건)
        (() => {
          let q = admin
            .from("api_error_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
          if (periodDate) q = q.gte("created_at", periodDate);
          if (errorType !== "all") q = q.eq("error_type", errorType);
          return q;
        })(),

        // 일별 에러 추이 (raw data)
        (() => {
          let q = admin
            .from("api_error_logs")
            .select("created_at, error_type")
            .order("created_at", { ascending: true });
          if (periodDate) q = q.gte("created_at", periodDate);
          return q;
        })(),

        // 에러 유형별 카운트
        (() => {
          let q = admin.from("api_error_logs").select("error_type");
          if (periodDate) q = q.gte("created_at", periodDate);
          return q;
        })(),
      ]);

    // 일별 에러 추이 집계
    const dailyMap = new Map<string, { date: string; count: number }>();
    for (const row of (errorTrendResult.data as {
      created_at: string;
      error_type: string;
    }[]) ?? []) {
      const date = new Date(row.created_at).toISOString().split("T")[0];
      const existing = dailyMap.get(date) ?? { date, count: 0 };
      existing.count++;
      dailyMap.set(date, existing);
    }
    const dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // 에러 유형별 분포
    const typeCountMap = new Map<string, number>();
    for (const row of (errorTypeCountResult.data as {
      error_type: string;
    }[]) ?? []) {
      typeCountMap.set(
        row.error_type,
        (typeCountMap.get(row.error_type) ?? 0) + 1,
      );
    }
    const typeDistribution = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      recent_errors: recentErrorsResult.data ?? [],
      daily_trend: dailyTrend,
      type_distribution: typeDistribution,
      total_errors: (errorTypeCountResult.data ?? []).length,
    });
  } catch (error) {
    console.error("에러 로그 조회 실패:", error);
    return NextResponse.json(
      { error: "에러 로그를 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}
