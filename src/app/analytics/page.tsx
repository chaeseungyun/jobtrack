import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { requireServerAuth } from "@/lib/auth/session";
import { createAnalyticsContainer } from "@/lib/containers/analytics.container";
import { dashboardAnalyticsQueryKey } from "@/lib/query/analytics";

import { AnalyticsView } from "@/app/analytics/_components/analytics-view.client";
import { AppShell } from "@/components/app/app-shell";

export default async function AnalyticsPage() {
  const auth = await requireServerAuth("/analytics");
  const { analyticsService } = createAnalyticsContainer();
  const queryClient = new QueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: dashboardAnalyticsQueryKey("30d"),
      queryFn: () => analyticsService.getDashboardAnalytics(auth.sub, { range: "30d" }),
    });
  } catch {
    // prefetch 실패 시 클라이언트에서 재시도
  }

  return (
    <AppShell
      title="분석"
      description="지원 활동을 데이터로 분석하고 전략을 점검하세요."
      activePath="/analytics"
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AnalyticsView />
      </HydrationBoundary>
    </AppShell>
  );
}
