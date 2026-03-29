"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PeriodFilter } from "./_components/period-filter";
import { StatCards } from "./_components/stat-cards";
import { DailyTrendChart } from "./_components/daily-trend-chart";
import { TypeDistributionChart } from "./_components/type-distribution-chart";
import { PopularQueries } from "./_components/popular-queries";
import { ConversionStats } from "./_components/conversion-stats";
import { RecentSessionsTable } from "./_components/recent-sessions-table";

interface AdminStats {
  overview: {
    total_sessions: number;
    today_sessions: number;
    total_users: number;
    guest_session_ratio: number;
  };
  daily_trend: { date: string; guest: number; member: number }[];
  popular_queries: { query: string; count: number }[];
  type_distribution: {
    type_name: string;
    display_name: string;
    color: string;
    count: number;
  }[];
  conversion: {
    claimed_sessions: number;
    total_guest_sessions: number;
    rate: number;
  };
  completion: {
    guest_total: number;
    guest_completed: number;
    guest_rate: number;
    member_total: number;
    member_completed: number;
    member_rate: number;
  };
  recent_guest_sessions: {
    id: string;
    query: string;
    created_at: string;
    is_completed: boolean;
    question_count: number;
    interview_type: { display_name: string; color: string } | null;
  }[];
}

export default function AdminPage() {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${p}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("통계 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">서비스 현황</h2>
        <PeriodFilter value={period} onChange={handlePeriodChange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <StatCards data={stats.overview} />

          <div className="grid gap-6 lg:grid-cols-2">
            <DailyTrendChart data={stats.daily_trend} />
            <TypeDistributionChart data={stats.type_distribution} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PopularQueries data={stats.popular_queries} />
            <ConversionStats
              conversion={stats.conversion}
              completion={stats.completion}
            />
          </div>

          <RecentSessionsTable data={stats.recent_guest_sessions} />
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          데이터를 불러올 수 없습니다
        </p>
      )}
    </div>
  );
}
