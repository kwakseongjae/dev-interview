"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface TypeData {
  type_name: string;
  display_name: string;
  color: string;
  count: number;
}

interface TypeDistributionChartProps {
  data: TypeData[];
}

export function TypeDistributionChart({ data }: TypeDistributionChartProps) {
  const chartConfig = data.reduce(
    (acc, item) => {
      acc[item.type_name] = {
        label: item.display_name,
        color: item.color || "hsl(var(--chart-1))",
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>,
  ) satisfies ChartConfig;

  // BarChart용 데이터 변환
  const chartData = data.map((item) => ({
    name: item.display_name,
    count: item.count,
    fill: item.color || "hsl(var(--chart-1))",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>면접 유형별 분포</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            데이터가 없습니다
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
