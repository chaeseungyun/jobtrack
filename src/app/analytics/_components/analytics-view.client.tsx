"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AnalyticsQueryParams } from "@/lib/core/analytics";
import {
  dashboardAnalyticsQueryKey,
  fetchDashboardAnalytics,
} from "@/lib/query/analytics";

import { DashboardKpiCards } from "@/app/dashboard/_components/dashboard-kpi-cards";
import { DashboardFunnelChart } from "@/app/dashboard/_components/dashboard-funnel-chart.client";
import { DashboardTrendChart } from "@/app/dashboard/_components/dashboard-trend-chart.client";
import { DashboardSourceChart } from "@/app/dashboard/_components/dashboard-source-chart.client";
import { Button } from "@/components/ui/button";

const RANGE_OPTIONS: { label: string; value: AnalyticsQueryParams["range"] }[] = [
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "90일", value: "90d" },
  { label: "전체", value: "all" },
];

export function AnalyticsView() {
  const [range, setRange] = useState<AnalyticsQueryParams["range"]>("30d");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: dashboardAnalyticsQueryKey(range),
    queryFn: () => fetchDashboardAnalytics({ range }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* Range Selector */}
      <div className="flex items-center gap-2" role="group" aria-label="분석 기간 선택">
        {RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={range === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setRange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">분석 데이터를 불러오는 중...</p>
      ) : null}

      {/* Error */}
      {isError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "분석 데이터를 불러오지 못했습니다."}
        </p>
      ) : null}

      {/* Data */}
      {data ? (
        <>
          <DashboardKpiCards summary={data.summary} />

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <DashboardFunnelChart funnel={data.funnel} />
            </div>
            <div className="lg:col-span-3">
              <DashboardTrendChart trend={data.trend} />
            </div>
          </div>

          <DashboardSourceChart sourcePerformance={data.sourcePerformance} />
        </>
      ) : null}
    </div>
  );
}
