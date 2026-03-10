"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import type { SourcePerformance } from "@/lib/core/analytics";
import { ChartCard } from "@/components/charts";
import { CHART_COLORS } from "@/components/charts/chart-colors";

interface DashboardSourceChartProps {
  sourcePerformance: SourcePerformance[];
}

const SOURCE_LABELS: Record<string, string> = {
  saramin: "사람인",
  jobkorea: "잡코리아",
  company: "회사 직접",
  linkedin: "링크드인",
  unknown: "기타",
  etc: "기타",
};

function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function DashboardSourceChart({ sourcePerformance }: DashboardSourceChartProps) {
  const data = sourcePerformance.map((item) => ({
    source: getSourceLabel(item.source),
    서류합격률: item.documentPassRate,
    면접전환율: item.interviewRate,
    최종합격률: item.finalPassRate,
  }));

  return (
    <ChartCard
      title="출처별 성과"
      description="출처별 전환율 비교"
      isEmpty={sourcePerformance.length === 0}
      emptyMessage="출처 데이터가 없습니다"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="source"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            formatter={(value: number) => `${value}%`}
          />
          <Legend />
          <Bar dataKey="서류합격률" fill={CHART_COLORS.chart1} radius={[4, 4, 0, 0]} />
          <Bar dataKey="면접전환율" fill={CHART_COLORS.chart2} radius={[4, 4, 0, 0]} />
          <Bar dataKey="최종합격률" fill={CHART_COLORS.chart3} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
