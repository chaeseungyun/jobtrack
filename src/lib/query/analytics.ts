import { analyticsApi } from "@/lib/api/client";
import type { AnalyticsQueryParams } from "@/lib/core/analytics";

export const dashboardAnalyticsQueryKey = (range?: string) =>
  ["analytics", "dashboard", range ?? "30d"] as const;

export const boardAnalyticsQueryKey = () => ["analytics", "board"] as const;

export const fetchDashboardAnalytics = async (params?: AnalyticsQueryParams) => {
  return analyticsApi.dashboard(params);
};

export const fetchBoardAnalytics = async () => {
  return analyticsApi.board();
};
