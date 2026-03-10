"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { StageFunnelItem } from "@/lib/core/analytics";
import { STAGE_LABELS } from "@/lib/app/stages";
import { ChartCard } from "@/components/charts";
import { CHART_COLORS } from "@/components/charts/chart-colors";

interface DashboardFunnelChartProps {
  funnel: StageFunnelItem[];
}

export function DashboardFunnelChart({ funnel }: DashboardFunnelChartProps) {
  const isEmpty = funnel.every((item) => item.count === 0);

  const data = funnel.map((item) => ({
    stage: STAGE_LABELS[item.stage],
    count: item.count,
  }));

  return (
    <ChartCard
      title="단계별 현황"
      description="각 단계에 있는 지원서 수"
      isEmpty={isEmpty}
      emptyMessage="지원서가 없습니다"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="stage"
            width={80}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
          />
          <Bar dataKey="count" fill={CHART_COLORS.chart1} radius={[0, 4, 4, 0]} name="지원서 수" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
