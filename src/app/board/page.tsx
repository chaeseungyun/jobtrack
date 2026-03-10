import Link from "next/link";

import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import { requireServerAuth } from "@/lib/auth/session";
import { createApplicationContainer } from "@/lib/containers/application.container";
import { createAnalyticsContainer } from "@/lib/containers/analytics.container";
import type { BoardAnalytics, StageConversion, StagnantApplication } from "@/lib/core/analytics";
import type { ApplicationRow, StageType } from "@/lib/supabase/types";

import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default async function BoardPage() {
  const auth = await requireServerAuth("/board");
  const { applicationService } = createApplicationContainer();

  let errorMessage: string | null = null;
  let applications: ApplicationRow[] = [];

  try {
    applications = await applicationService.list(auth.sub);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "불러오기 실패";
  }

  const grouped = STAGE_ORDER.reduce<Record<StageType, ApplicationRow[]>>(
    (acc, stage) => {
      acc[stage] = applications.filter((application) => application.current_stage === stage);
      return acc;
    },
    {} as Record<StageType, ApplicationRow[]>,
  );

  // Board Analytics — 실패해도 기존 보드는 정상 동작
  const { analyticsService } = createAnalyticsContainer();
  let boardAnalytics: BoardAnalytics | null = null;
  try {
    boardAnalytics = await analyticsService.getBoardAnalytics(auth.sub);
  } catch {
    // analytics 실패 시 대시보드는 기존처럼 동작
  }

  // 전환율 룩업: fromStage → StageConversion
  const conversionMap = new Map<StageType, StageConversion>();
  if (boardAnalytics) {
    for (const conv of boardAnalytics.conversions) {
      conversionMap.set(conv.fromStage, conv);
    }
  }

  // 정체 지원서 룩업: applicationId → StagnantApplication
  const stagnantMap = new Map<string, StagnantApplication>();
  if (boardAnalytics) {
    for (const s of boardAnalytics.stagnant) {
      stagnantMap.set(s.applicationId, s);
    }
  }

  return (
    <AppShell
      title="칸반 보드"
      description="단계별 파이프라인을 한눈에 보고 병목을 파악하세요."
      activePath="/board"
    >
      {errorMessage ? (
        <p className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGE_ORDER.map((stage) => (
          <Card key={stage} className="h-full">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{STAGE_LABELS[stage]}</CardTitle>
                <Badge variant="secondary">{grouped[stage].length}</Badge>
              </div>
              {conversionMap.has(stage) ? (
                <p className="text-xs text-muted-foreground">
                  → {STAGE_LABELS[conversionMap.get(stage)!.toStage]} {conversionMap.get(stage)!.rate}%
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[stage].map((application) => (
                <Link
                  key={application.id}
                  href={`/applications/${application.id}`}
                  className="block rounded-md border border-border p-3 transition hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{application.company_name}</p>
                    {stagnantMap.has(application.id) ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                        {stagnantMap.get(application.id)!.daysSinceUpdate}일 정체
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{application.position}</p>
                </Link>
              ))}
              {grouped[stage].length === 0 ? (
                <p className="text-sm text-muted-foreground">항목이 없습니다.</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
