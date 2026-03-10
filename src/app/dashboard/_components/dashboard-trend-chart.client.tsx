"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { TrendItem } from "@/lib/core/analytics";
import { ChartCard } from "@/components/charts";
import { CHART_COLORS } from "@/components/charts/chart-colors";

interface DashboardTrendChartProps {
  trend: TrendItem[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function DashboardTrendChart({ trend }: DashboardTrendChartProps) {
  const data = trend.map((item) => ({
    date: formatDate(item.date),
    count: item.count,
  }));

  return (
    <ChartCard
      title="지원 추이"
      description="최근 30일 일별 지원 수"
      isEmpty={trend.length === 0}
      emptyMessage="추이 데이터가 없습니다"
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS.chart2}
            strokeWidth={2}
            dot={{ r: 3 }}
            name="지원 수"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
