import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

function getPeriodDate(period: string): string | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 (DB 기반)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const periodDate = getPeriodDate(period);

    // 모든 쿼리를 병렬 실행
    const [
      totalSessionsResult,
      todaySessionsResult,
      totalUsersResult,
      guestSessionsResult,
      dailyTrendResult,
      popularQueriesResult,
      typeDistributionResult,
      claimedSessionsResult,
      guestCompletionResult,
      memberCompletionResult,
      recentGuestSessionsResult,
    ] = await Promise.all([
      // 총 세션 수
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select("*", { count: "exact", head: true });
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 오늘 세션 수
      (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return supabaseAdmin
          .from("interview_sessions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today.toISOString());
      })(),

      // 총 사용자 수
      supabaseAdmin
        .from("users")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),

      // 비회원 세션 수
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select("*", { count: "exact", head: true })
          .is("user_id", null);
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 일별 추이 (raw data — 클라이언트에서 집계)
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select("created_at, user_id")
          .order("created_at", { ascending: true });
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 인기 쿼리 (비회원 기준)
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select("query")
          .is("user_id", null);
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 면접 유형별 분포
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select(
            "interview_type_id, interview_types(name, display_name, color)",
          )
          .not("interview_type_id", "is", null);
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // Claimed 세션 수 (전환율)
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select("*", { count: "exact", head: true })
          .not("claimed_at", "is", null);
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 비회원 완료율
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select("is_completed")
          .is("user_id", null);
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 회원 완료율
      (() => {
        let q = supabaseAdmin
          .from("interview_sessions")
          .select("is_completed")
          .not("user_id", "is", null);
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 최근 비회원 세션 목록
      supabaseAdmin
        .from("interview_sessions")
        .select(
          `
          id,
          query,
          created_at,
          is_completed,
          interview_type_id,
          interview_types(display_name, color),
          session_questions(count)
        `,
        )
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // 일별 추이 집계
    const dailyMap = new Map<
      string,
      { date: string; guest: number; member: number }
    >();
    for (const row of dailyTrendResult.data ?? []) {
      const date = new Date(row.created_at).toISOString().split("T")[0];
      const existing = dailyMap.get(date) ?? { date, guest: 0, member: 0 };
      if (row.user_id === null) {
        existing.guest++;
      } else {
        existing.member++;
      }
      dailyMap.set(date, existing);
    }
    const dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // 인기 쿼리 집계
    const queryCountMap = new Map<string, number>();
    for (const row of popularQueriesResult.data ?? []) {
      const q = row.query?.trim();
      if (q) {
        queryCountMap.set(q, (queryCountMap.get(q) ?? 0) + 1);
      }
    }
    const popularQueries = Array.from(queryCountMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 면접 유형별 분포 집계
    const typeMap = new Map<
      string,
      { type_name: string; display_name: string; color: string; count: number }
    >();
    for (const row of typeDistributionResult.data ?? []) {
      const typeId = row.interview_type_id;
      const typeInfo = row.interview_types as {
        name: string;
        display_name: string;
        color: string;
      } | null;
      if (typeId && typeInfo) {
        const existing = typeMap.get(typeId) ?? {
          type_name: typeInfo.name,
          display_name: typeInfo.display_name,
          color: typeInfo.color,
          count: 0,
        };
        existing.count++;
        typeMap.set(typeId, existing);
      }
    }
    const typeDistribution = Array.from(typeMap.values()).sort(
      (a, b) => b.count - a.count,
    );

    // 완료율 계산
    const guestSessions = guestCompletionResult.data ?? [];
    const memberSessions = memberCompletionResult.data ?? [];
    const guestCompleted = guestSessions.filter(
      (s) => s.is_completed === true,
    ).length;
    const memberCompleted = memberSessions.filter(
      (s) => s.is_completed === true,
    ).length;

    // 최근 비회원 세션 포맷
    const recentGuestSessions = (recentGuestSessionsResult.data ?? []).map(
      (s) => ({
        id: s.id,
        query: s.query,
        created_at: s.created_at,
        is_completed: s.is_completed,
        question_count:
          (s.session_questions as { count: number }[])?.[0]?.count ?? 0,
        interview_type: s.interview_types
          ? {
              display_name: (
                s.interview_types as {
                  display_name: string;
                  color: string;
                }
              ).display_name,
              color: (
                s.interview_types as {
                  display_name: string;
                  color: string;
                }
              ).color,
            }
          : null,
      }),
    );

    const totalSessions = totalSessionsResult.count ?? 0;
    const guestSessionCount = guestSessionsResult.count ?? 0;

    return NextResponse.json({
      overview: {
        total_sessions: totalSessions,
        today_sessions: todaySessionsResult.count ?? 0,
        total_users: totalUsersResult.count ?? 0,
        guest_session_ratio:
          totalSessions > 0 ? guestSessionCount / totalSessions : 0,
      },
      daily_trend: dailyTrend,
      popular_queries: popularQueries,
      type_distribution: typeDistribution,
      conversion: {
        claimed_sessions: claimedSessionsResult.count ?? 0,
        total_guest_sessions: guestSessionCount,
        rate:
          guestSessionCount > 0
            ? (claimedSessionsResult.count ?? 0) / guestSessionCount
            : 0,
      },
      completion: {
        guest_total: guestSessions.length,
        guest_completed: guestCompleted,
        guest_rate:
          guestSessions.length > 0 ? guestCompleted / guestSessions.length : 0,
        member_total: memberSessions.length,
        member_completed: memberCompleted,
        member_rate:
          memberSessions.length > 0
            ? memberCompleted / memberSessions.length
            : 0,
      },
      recent_guest_sessions: recentGuestSessions,
    });
  } catch (error) {
    console.error("관리자 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "통계를 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}
