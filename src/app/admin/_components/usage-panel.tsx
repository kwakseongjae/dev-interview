"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";

interface UsageData {
  summary: {
    today: { requests: number; tokens: number; costCents: number };
    totalRequests: number;
    totalTokens: number;
    totalCostCents: number;
    dailyBudgetCents: number;
    budgetUsagePercent: number;
  };
  dailyTrend: {
    day: string;
    requests: number;
    tokens: number;
    costCents: number;
  }[];
  byEndpoint: {
    endpoint: string;
    requests: number;
    tokens: number;
    costCents: number;
  }[];
  rateLimitConfigs: Record<string, { maxRequests: number; window: string }>;
}

export function UsagePanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage?days=${d}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("사용량 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        데이터를 불러올 수 없습니다
      </p>
    );
  }

  const { summary, dailyTrend, byEndpoint, rateLimitConfigs } = data;
  const budgetPercent = summary.budgetUsagePercent;

  return (
    <div className="space-y-6">
      {/* 기간 선택 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">API 사용량 & Rate Limit</h2>
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                days === d
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* 오늘 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Activity className="h-4 w-4" />}
          label="오늘 요청"
          value={summary.today.requests.toLocaleString()}
          sub={`전체 ${summary.totalRequests.toLocaleString()}`}
        />
        <SummaryCard
          icon={<Zap className="h-4 w-4" />}
          label="오늘 토큰"
          value={summary.today.tokens.toLocaleString()}
          sub={`전체 ${summary.totalTokens.toLocaleString()}`}
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="오늘 비용"
          value={`$${(summary.today.costCents / 100).toFixed(2)}`}
          sub={`예산 $${(summary.dailyBudgetCents / 100).toFixed(2)}/일`}
        />
        <SummaryCard
          icon={
            budgetPercent > 80 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Shield className="h-4 w-4" />
            )
          }
          label="예산 사용률"
          value={`${budgetPercent}%`}
          sub={budgetPercent > 80 ? "경고: 예산 임계치 초과" : "정상"}
          alert={budgetPercent > 80}
        />
      </div>

      {/* 일별 추이 */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium">일별 요청 추이</h3>
        {dailyTrend.length > 0 ? (
          <div className="space-y-1">
            {dailyTrend.map((d) => {
              const maxReq = Math.max(...dailyTrend.map((t) => t.requests), 1);
              const width = Math.max(2, (d.requests / maxReq) * 100);
              return (
                <div key={d.day} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-muted-foreground">
                    {d.day.slice(5)}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-4 rounded bg-blue-500/20"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums">
                    {d.requests}건
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                    ${(d.costCents / 100).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">데이터 없음</p>
        )}
      </div>

      {/* 엔드포인트별 사용량 */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium">엔드포인트별 사용량</h3>
        {byEndpoint.length > 0 ? (
          <div className="space-y-2">
            {byEndpoint.slice(0, 15).map((ep) => (
              <div
                key={ep.endpoint}
                className="flex items-center justify-between text-xs"
              >
                <code className="max-w-[50%] truncate text-muted-foreground">
                  {ep.endpoint}
                </code>
                <div className="flex gap-4">
                  <span className="tabular-nums">
                    {ep.requests.toLocaleString()}건
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {ep.tokens.toLocaleString()} tok
                  </span>
                  <span className="w-16 text-right tabular-nums">
                    ${(ep.costCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">데이터 없음</p>
        )}
      </div>

      {/* Rate Limit 설정 */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium">Rate Limit 설정</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(rateLimitConfigs).map(([tier, config]) => (
            <div key={tier} className="rounded-md border bg-muted/50 px-3 py-2">
              <div className="text-xs font-medium">{tier}</div>
              <div className="text-sm text-muted-foreground">
                {config.maxRequests}회 / {formatWindow(config.window)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${alert ? "border-red-500/50 bg-red-500/5" : ""}`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div
        className={`mt-0.5 text-xs ${alert ? "text-red-500" : "text-muted-foreground"}`}
      >
        {sub}
      </div>
    </div>
  );
}

function formatWindow(window: string): string {
  const match = window.match(/^(\d+)\s*s$/);
  if (!match) return window;
  const seconds = parseInt(match[1]);
  if (seconds >= 86400) return `${seconds / 86400}일`;
  if (seconds >= 3600) return `${seconds / 3600}시간`;
  if (seconds >= 60) return `${seconds / 60}분`;
  return `${seconds}초`;
}
