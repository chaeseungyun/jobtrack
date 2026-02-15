import Link from "next/link";

import { STAGE_LABELS } from "@/lib/app/stages";
import { requireServerAuth } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApplicationRow } from "@/lib/supabase/types";

import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UpcomingItem {
  id: string;
  applicationId: string;
  companyName: string;
  position: string;
  type: string;
  at: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const auth = await requireServerAuth();
  const supabase = createServerSupabaseClient();

  let errorMessage: string | null = null;
  let applications: ApplicationRow[] = [];
  let upcoming: UpcomingItem[] = [];

  try {
    const { data: applicationRows, error: applicationsError } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", auth.sub)
      .order("created_at", { ascending: false })
      .returns<ApplicationRow[]>();

    if (applicationsError) {
      throw new Error(applicationsError.message);
    }

    applications = applicationRows ?? [];

    const targetApplications = applications.slice(0, 5);
    const targetIds = targetApplications.map((application) => application.id);

    if (targetIds.length > 0) {
      const { data: upcomingEvents, error: eventsError } = await supabase
        .from("events")
        .select("id,application_id,event_type,scheduled_at")
        .in("application_id", targetIds)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true });

      if (eventsError) {
        throw new Error(eventsError.message);
      }

      const applicationMap = new Map(targetApplications.map((item) => [item.id, item]));

      upcoming = (upcomingEvents ?? [])
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
    errorMessage = error instanceof Error ? error.message : "Failed to load";
  }

  const stageCounts = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.current_stage] = (acc[application.current_stage] ?? 0) + 1;
    return acc;
  }, {});

  const interviewCount = stageCounts.interview ?? 0;

  return (
    <AppShell
      title="Dashboard"
      description="Track outcomes and upcoming schedules from one screen."
      activePath="/dashboard"
    >
      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{applications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">Document Pass</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">
              {stageCounts.document_pass ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">Interviewing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{interviewCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">No scheduled events in tracked items.</p>
            ) : null}
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Badge variant="outline">{item.type}</Badge>
                  <span className="text-xs text-slate-500">
                    {DATE_FORMATTER.format(new Date(item.at))}
                  </span>
                </div>
                <p className="font-medium text-slate-900">{item.companyName}</p>
                <p className="text-sm text-slate-600">{item.position}</p>
                <Link
                  className="mt-2 inline-block text-xs font-medium text-slate-900 underline"
                  href={`/applications/${item.applicationId}`}
                >
                  Open detail
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.slice(0, 6).map((application) => (
              <Link
                key={application.id}
                href={`/applications/${application.id}`}
                className="block rounded-md border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <p className="font-medium text-slate-900">{application.company_name}</p>
                <p className="text-sm text-slate-600">{application.position}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {STAGE_LABELS[application.current_stage]}
                </p>
              </Link>
            ))}
            {!applications.length ? (
              <p className="text-sm text-slate-500">No applications yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
