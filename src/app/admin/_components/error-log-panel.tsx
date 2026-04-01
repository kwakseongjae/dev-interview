"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  error_code: string | null;
  endpoint: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface ErrorStats {
  recent_errors: ErrorLog[];
  daily_trend: { date: string; count: number }[];
  type_distribution: { type: string; count: number }[];
  total_errors: number;
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  api_error: "API 에러",
  token_limit: "토큰 부족",
  rate_limit: "요청 제한",
  timeout: "타임아웃",
  embedding_error: "임베딩 에러",
  unknown: "기타",
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  api_error: "destructive",
  token_limit: "default",
  rate_limit: "secondary",
  timeout: "outline",
  embedding_error: "default",
  unknown: "secondary",
};

const trendChartConfig = {
  count: {
    label: "에러 수",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const typeChartConfig = {
  count: {
    label: "건수",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ErrorLogPanel() {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchErrors = useCallback(async (p: string, type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/errors?period=${p}&type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("에러 로그 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchErrors(period, typeFilter);
  }, [period, typeFilter, fetchErrors]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">에러 로그</h2>
          <Badge variant="outline">{stats.total_errors}건</Badge>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchErrors(period, typeFilter)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 일별 에러 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>일별 에러 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.daily_trend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                에러가 없습니다
              </p>
            ) : (
              <ChartContainer
                config={trendChartConfig}
                className="h-[250px] w-full"
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
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 에러 유형별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>에러 유형별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.type_distribution.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                에러가 없습니다
              </p>
            ) : (
              <ChartContainer
                config={typeChartConfig}
                className="h-[250px] w-full"
              >
                <BarChart
                  data={stats.type_distribution.map((d) => ({
                    ...d,
                    label: ERROR_TYPE_LABELS[d.type] ?? d.type,
                  }))}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 필터 + 에러 로그 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>최근 에러</CardTitle>
            <div className="flex gap-1">
              {["all", "token_limit", "rate_limit", "api_error"].map((t) => (
                <Button
                  key={t}
                  variant={typeFilter === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(t)}
                >
                  {t === "all" ? "전체" : (ERROR_TYPE_LABELS[t] ?? t)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recent_errors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              에러가 없습니다
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">유형</TableHead>
                  <TableHead>메시지</TableHead>
                  <TableHead className="w-[150px]">엔드포인트</TableHead>
                  <TableHead className="w-[150px]">시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent_errors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell>
                      <Badge
                        variant={
                          (ERROR_TYPE_COLORS[error.error_type] as
                            | "destructive"
                            | "default"
                            | "secondary"
                            | "outline") ?? "secondary"
                        }
                      >
                        {error.error_type === "token_limit" && (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        )}
                        {ERROR_TYPE_LABELS[error.error_type] ??
                          error.error_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate text-sm">
                      {error.error_message}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {error.endpoint ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(error.created_at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
