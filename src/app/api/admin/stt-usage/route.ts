// Applied rules: async-parallel
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked =
    local.length <= 2 ? local[0] + "***" : local.slice(0, 2) + "***";
  return `${masked}@${domain}`;
}

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

    let periodDate: string | null = null;
    if (period !== "all") {
      const days = period === "7d" ? 7 : 30;
      const date = new Date();
      date.setDate(date.getDate() - days);
      periodDate = date.toISOString();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    // 병렬 쿼리: STT 사용량 데이터
    const [
      allLogsResult,
      todayLogsResult,
      weekLogsResult,
      monthLogsResult,
      configResult,
    ] = await Promise.all([
      // 전체 기간 로그
      (() => {
        let q = admin
          .from("stt_usage_logs")
          .select("user_id, duration_seconds, estimated_cost, created_at")
          .order("created_at", { ascending: true });
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 오늘
      admin
        .from("stt_usage_logs")
        .select("duration_seconds, estimated_cost")
        .gte("created_at", today.toISOString()),

      // 이번 주
      admin
        .from("stt_usage_logs")
        .select("duration_seconds, estimated_cost")
        .gte("created_at", weekAgo.toISOString()),

      // 이번 달
      admin
        .from("stt_usage_logs")
        .select("duration_seconds, estimated_cost")
        .gte("created_at", monthAgo.toISOString()),

      // Kill switch 상태
      admin
        .from("app_config")
        .select("value")
        .eq("key", "stt_enabled")
        .single(),
    ]);

    type SttLogRow = {
      user_id: string | null;
      duration_seconds: number;
      estimated_cost: number;
      created_at: string;
    };

    type SttSummaryRow = {
      duration_seconds: number;
      estimated_cost: number;
    };

    function sumCost(rows: SttSummaryRow[]): number {
      return rows.reduce((sum, r) => sum + (r.estimated_cost ?? 0), 0);
    }

    function sumDuration(rows: SttSummaryRow[]): number {
      return rows.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0);
    }

    const allData = (allLogsResult.data ?? []) as SttLogRow[];
    const todayData = (todayLogsResult.data ?? []) as SttSummaryRow[];
    const weekData = (weekLogsResult.data ?? []) as SttSummaryRow[];
    const monthData = (monthLogsResult.data ?? []) as SttSummaryRow[];

    // KPI
    const kpi = {
      today_cost: sumCost(todayData),
      today_duration: sumDuration(todayData),
      week_cost: sumCost(weekData),
      week_duration: sumDuration(weekData),
      month_cost: sumCost(monthData),
      month_duration: sumDuration(monthData),
    };

    // 일별 추이
    const dailyMap = new Map<
      string,
      { cost: number; duration: number; count: number }
    >();
    for (const row of allData) {
      const date = new Date(row.created_at).toISOString().split("T")[0];
      const existing = dailyMap.get(date) ?? {
        cost: 0,
        duration: 0,
        count: 0,
      };
      existing.cost += row.estimated_cost ?? 0;
      existing.duration += row.duration_seconds ?? 0;
      existing.count += 1;
      dailyMap.set(date, existing);
    }
    const daily_trend = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 유저별 사용량
    const userMap = new Map<
      string,
      { total_cost: number; total_duration: number; count: number }
    >();
    for (const row of allData) {
      const uid = row.user_id ?? "anonymous";
      const existing = userMap.get(uid) ?? {
        total_cost: 0,
        total_duration: 0,
        count: 0,
      };
      existing.total_cost += row.estimated_cost ?? 0;
      existing.total_duration += row.duration_seconds ?? 0;
      existing.count += 1;
      userMap.set(uid, existing);
    }

    // Top users — 이메일 조회
    const userIds = Array.from(userMap.keys()).filter(
      (id) => id !== "anonymous",
    );
    let emailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select("id, email")
        .in("id", userIds);
      if (users) {
        emailMap = new Map(
          (users as { id: string; email: string }[]).map((u) => [
            u.id,
            u.email,
          ]),
        );
      }
    }

    const top_users = Array.from(userMap.entries())
      .map(([user_id, v]) => ({
        user_id,
        email: maskEmail(
          emailMap.get(user_id) ??
            (user_id === "anonymous" ? "비회원" : "알 수 없음"),
        ),
        ...v,
      }))
      .sort((a, b) => b.total_cost - a.total_cost)
      .slice(0, 20);

    const stt_enabled = configResult.data?.value !== "false";

    return NextResponse.json({
      kpi,
      daily_trend,
      top_users,
      stt_enabled,
    });
  } catch (error) {
    console.error("STT 사용량 조회 실패:", error);
    return NextResponse.json(
      { error: "STT 사용량을 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}
