"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Zap,
  TrendingUp,
  Calendar,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PeriodFilter } from "./period-filter";

interface TokenUsageStats {
  summary: {
    today: number;
    this_week: number;
    this_month: number;
    total: number;
    daily_average: number;
  };
  daily_trend: { date: string; tokens: number }[];
  feature_breakdown: {
    quick_feedback: number;
    detailed_feedback: number;
    model_answer: number;
  };
  model_breakdown: { model: string; tokens: number }[];
  alert: {
    is_high_usage: boolean;
    has_token_errors: boolean;
    recent_token_errors: Array<{
      id: string;
      error_type: string;
      error_message: string;
      created_at: string;
    }>;
    message: string | null;
  };
}

const ANTHROPIC_BILLING_URL = "https://console.anthropic.com/settings/billing";
const ANTHROPIC_USAGE_URL = "https://console.anthropic.com/settings/usage";
const VOYAGE_DASHBOARD_URL = "https://dash.voyageai.com/";

const trendChartConfig = {
  tokens: {
    label: "토큰",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const featureChartConfig = {
  tokens: {
    label: "토큰",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

export function TokenUsagePanel() {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState<TokenUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/token-usage?period=${p}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("토큰 사용량 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

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

  const featureData = [
    {
      name: "빠른 피드백",
      tokens: stats.feature_breakdown.quick_feedback,
    },
    {
      name: "상세 피드백",
      tokens: stats.feature_breakdown.detailed_feedback,
    },
    {
      name: "모범 답안",
      tokens: stats.feature_breakdown.model_answer,
    },
  ];

  const totalFeatureTokens =
    stats.feature_breakdown.quick_feedback +
    stats.feature_breakdown.detailed_feedback +
    stats.feature_breakdown.model_answer;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">API 토큰 사용량</h2>
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

      {/* 토큰 부족/에러 경고 배너 */}
      {stats.alert.message && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            stats.alert.has_token_errors
              ? "border-destructive/50 bg-destructive/10"
              : "border-yellow-500/50 bg-yellow-500/10"
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              stats.alert.has_token_errors
                ? "text-destructive"
                : "text-yellow-600"
            }`}
          />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">{stats.alert.message}</p>
            {stats.alert.recent_token_errors.length > 0 && (
              <div className="space-y-1">
                {stats.alert.recent_token_errors.slice(0, 3).map((err) => (
                  <p key={err.id} className="text-xs text-muted-foreground">
                    {new Date(err.created_at).toLocaleString("ko-KR")} —{" "}
                    {err.error_message.slice(0, 100)}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <a
                  href={ANTHROPIC_BILLING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Anthropic 크레딧 충전
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a
                  href={VOYAGE_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Voyage AI 대시보드
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 사용량</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokenCount(stats.summary.today)}
            </div>
            <p className="text-xs text-muted-foreground">토큰</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 주</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokenCount(stats.summary.this_week)}
            </div>
            <p className="text-xs text-muted-foreground">토큰</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokenCount(stats.summary.this_month)}
            </div>
            <p className="text-xs text-muted-foreground">토큰</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일 평균</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokenCount(stats.summary.daily_average)}
            </div>
            <p className="text-xs text-muted-foreground">토큰/일</p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 일별 토큰 사용 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>일별 토큰 사용 추이</CardTitle>
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
                <LineChart
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
                    tickFormatter={(value: number) => formatTokenCount(value)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke="var(--color-tokens)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 기능별 토큰 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>기능별 토큰 사용</CardTitle>
          </CardHeader>
          <CardContent>
            {totalFeatureTokens === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                데이터가 없습니다
              </p>
            ) : (
              <div className="space-y-6">
                <ChartContainer
                  config={featureChartConfig}
                  className="h-[180px] w-full"
                >
                  <BarChart
                    data={featureData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => formatTokenCount(value)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="tokens"
                      fill="var(--color-tokens)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>

                <div className="space-y-3">
                  {featureData.map((f) => (
                    <div key={f.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{f.name}</span>
                        <span className="font-medium">
                          {totalFeatureTokens > 0
                            ? ((f.tokens / totalFeatureTokens) * 100).toFixed(1)
                            : 0}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          totalFeatureTokens > 0
                            ? (f.tokens / totalFeatureTokens) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 모델별 사용량 */}
      {stats.model_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>모델별 토큰 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.model_breakdown.map((m) => (
                <div
                  key={m.model}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{m.model}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTokenCount(m.tokens)} 토큰
                    </p>
                  </div>
                  <Badge variant="outline">
                    {stats.summary.total > 0
                      ? ((m.tokens / stats.summary.total) * 100).toFixed(1)
                      : 0}
                    %
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 빠른 링크 */}
      <Card>
        <CardHeader>
          <CardTitle>API 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href={ANTHROPIC_BILLING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <Zap className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Anthropic 크레딧 충전</p>
                <p className="text-xs text-muted-foreground">
                  Claude API 결제 관리
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href={ANTHROPIC_USAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Anthropic 사용량 확인</p>
                <p className="text-xs text-muted-foreground">
                  실시간 API 사용 현황
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href={VOYAGE_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <Activity className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Voyage AI 대시보드</p>
                <p className="text-xs text-muted-foreground">임베딩 API 관리</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
