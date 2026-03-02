import Link from "next/link";

import { STAGE_LABELS } from "@/lib/app/stages";
import { requireServerAuth } from "@/lib/auth/session";
import { createApplicationContainer } from "@/lib/containers/application.container";
import type { ApplicationRow, EventType } from "@/lib/supabase/types";

import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UpcomingItem {
  id: string;
  applicationId: string;
  companyName: string;
  position: string;
  type: EventType;
  at: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const auth = await requireServerAuth("/dashboard");
  const { applicationService } = createApplicationContainer();

  let errorMessage: string | null = null;
  let applications: ApplicationRow[] = [];
  let upcoming: UpcomingItem[] = [];

  try {
    applications = await applicationService.list(auth.sub);

    const targetApplications = applications.slice(0, 5);
    const targetIds = targetApplications.map((application) => application.id);

    if (targetIds.length > 0) {
      const upcomingEvents = await applicationService.listUpcomingEvents(targetIds);

      const applicationMap = new Map(targetApplications.map((item) => [item.id, item]));

      upcoming = upcomingEvents
        .map((event) => {
          const application = applicationMap.get(event.application_id);

          if (!application) {
            return null;
          }

          return {
            id: event.id,
            applicationId: application.id,
            companyName: application.company_name,
            position: application.position,
            type: event.event_type,
            at: event.scheduled_at,
          } satisfies UpcomingItem;
        })
        .filter((item): item is UpcomingItem => item !== null)
        .slice(0, 5);
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "불러오기 실패";
  }

  const stageCounts = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.current_stage] = (acc[application.current_stage] ?? 0) + 1;
    return acc;
  }, {});

  const interviewCount = stageCounts.interview ?? 0;

  return (
    <AppShell
      title="대시보드"
      description="지원 현황과 다가오는 일정을 한눈에 확인하세요."
      activePath="/dashboard"
    >
      {errorMessage ? (
        <p className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">전체 지원서</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{applications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">서류합격</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {stageCounts.document_pass ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">면접 진행 중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{interviewCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>다가오는 일정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">예정된 일정이 없습니다.</p>
            ) : null}
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border bg-muted p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Badge variant="outline">{item.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {DATE_FORMATTER.format(new Date(item.at))}
                  </span>
                </div>
                <p className="font-medium text-foreground">{item.companyName}</p>
                <p className="text-sm text-muted-foreground">{item.position}</p>
                <Link
                  className="mt-2 inline-block text-xs font-medium text-foreground underline"
                  href={`/applications/${item.applicationId}`}
                >
                  상세 보기
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>최근 지원서</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.slice(0, 6).map((application) => (
              <Link
                key={application.id}
                href={`/applications/${application.id}`}
                className="block rounded-md border border-border p-3 transition hover:bg-muted"
              >
                <p className="font-medium text-foreground">{application.company_name}</p>
                <p className="text-sm text-muted-foreground">{application.position}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {STAGE_LABELS[application.current_stage]}
                </p>
              </Link>
            ))}
            {!applications.length ? (
              <p className="text-sm text-muted-foreground">등록된 지원서가 없습니다.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
