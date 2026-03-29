"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  guest: {
    label: "비회원",
    color: "hsl(var(--chart-1))",
  },
  member: {
    label: "회원",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface DailyTrendData {
  date: string;
  guest: number;
  member: number;
}

interface DailyTrendChartProps {
  data: DailyTrendData[];
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>일별 세션 추이</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            데이터가 없습니다
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              data={data}
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
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="guest"
                stroke="var(--color-guest)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="member"
                stroke="var(--color-member)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
