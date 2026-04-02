// Applied rules: async-parallel, rerender-functional-setstate, rendering-conditional-render
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
  Mic,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PeriodFilter } from "./period-filter";

const OPENAI_BILLING_URL =
  "https://platform.openai.com/settings/organization/billing/overview";
const OPENAI_USAGE_URL = "https://platform.openai.com/usage";

interface SttUsageStats {
  kpi: {
    today_cost: number;
    today_duration: number;
    week_cost: number;
    week_duration: number;
    month_cost: number;
    month_duration: number;
  };
  daily_trend: {
    date: string;
    cost: number;
    duration: number;
    count: number;
  }[];
  top_users: {
    user_id: string;
    email: string;
    total_cost: number;
    total_duration: number;
    count: number;
  }[];
  stt_enabled: boolean;
}

const trendChartConfig = {
  cost: {
    label: "비용 ($)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${mins}분`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  }
  return `${seconds}초`;
}

export function SttUsagePanel() {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState<SttUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sttEnabled, setSttEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stt-usage?period=${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
      setSttEnabled(data.stt_enabled);
    } catch (error) {
      console.error("STT 사용량 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  const toggleStt = useCallback(async () => {
    const newState = !sttEnabled;
    if (
      sttEnabled &&
      !window.confirm("정말로 음성 입력을 비활성화하시겠습니까?")
    ) {
      return;
    }

    setToggling(true);
    try {
      const res = await fetch("/api/admin/stt-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newState }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setSttEnabled(newState);
    } catch (error) {
      console.error("STT 설정 변경 실패:", error);
    } finally {
      setToggling(false);
    }
  }, [sttEnabled]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        데이터를 불러올 수 없습니다
      </p>
    );
  }

  const highCostAlert = stats.kpi.today_cost > 5;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">STT 사용량</h2>
        <div className="flex items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchStats(period)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kill Switch */}
      <div
        className={`flex items-center justify-between rounded-lg border p-4 ${
          sttEnabled
            ? "border-green-500/30 bg-green-500/5"
            : "border-destructive/30 bg-destructive/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <Mic
            className={`h-5 w-5 ${sttEnabled ? "text-green-600" : "text-destructive"}`}
          />
          <div>
            <h3 className="font-semibold">음성 입력 (STT)</h3>
            <p className="text-sm text-muted-foreground">
              {sttEnabled
                ? "활성화됨 — 사용자가 음성으로 답변 가능"
                : "비활성화됨 — 텍스트 입력만 가능"}
            </p>
          </div>
        </div>
        <Button
          variant={sttEnabled ? "destructive" : "default"}
          onClick={toggleStt}
          disabled={toggling}
        >
          {toggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {sttEnabled ? "비활성화" : "활성화"}
        </Button>
      </div>

      {/* 비용 경고 배너 */}
      {highCostAlert ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium">
              오늘 STT 비용이 $5를 초과했습니다 (
              {formatCost(stats.kpi.today_cost)})
            </p>
            <p className="text-xs text-muted-foreground">
              비용 절감을 위해 STT 비활성화를 검토해주세요.
            </p>
          </div>
        </div>
      ) : null}

      {/* KPI 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 비용</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(stats.kpi.today_cost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(stats.kpi.today_duration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 주 비용</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(stats.kpi.week_cost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(stats.kpi.week_duration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 비용</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(stats.kpi.month_cost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(stats.kpi.month_duration)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* OpenAI 크레딧 관리 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href={OPENAI_BILLING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <Zap className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">OpenAI 크레딧 충전</p>
            <p className="text-xs text-muted-foreground">STT API 결제 관리</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>

        <a
          href={OPENAI_USAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">OpenAI 사용량 확인</p>
            <p className="text-xs text-muted-foreground">
              실시간 API 사용 현황
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
      </div>

      {/* 차트 영역 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 일별 비용 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>일별 STT 비용 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.daily_trend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                데이터가 없습니다
              </p>
            ) : (
              <ChartContainer
                config={trendChartConfig}
                className="h-[300px] w-full"
              >
                <AreaChart
                  data={stats.daily_trend}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value: string) => {
                      const d = new Date(value);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="var(--color-cost)"
                    fill="var(--color-cost)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>사용자별 STT 사용량</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.top_users.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                데이터가 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                  <span>이메일</span>
                  <span className="text-right">비용</span>
                  <span className="text-right">시간</span>
                  <span className="text-right">횟수</span>
                </div>
                {stats.top_users.slice(0, 10).map((user) => (
                  <div
                    key={user.user_id}
                    className="grid grid-cols-4 gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="truncate" title={user.email}>
                      {user.email}
                    </span>
                    <span className="text-right font-medium">
                      {formatCost(user.total_cost)}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {formatDuration(user.total_duration)}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {user.count}회
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
