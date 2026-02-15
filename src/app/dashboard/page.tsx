"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { applicationsApi, type ApplicationDetail } from "@/lib/api/client";
import { STAGE_LABELS } from "@/lib/app/stages";
import { getAuthToken } from "@/lib/auth/token";
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

export default function DashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      router.replace("/auth");
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const listResult = await applicationsApi.list(token);
        setApplications(listResult.applications);

        const detailTargets = listResult.applications.slice(0, 5);
        const details = await Promise.all(
          detailTargets.map((application) =>
            applicationsApi
              .get(token, application.id)
              .catch(() => null as ApplicationDetail | null)
          )
        );

        const now = Date.now();
        const upcomingEvents = details
          .flatMap((detail) => {
            if (!detail) {
              return [];
            }

            return detail.events
              .filter((event) => new Date(event.scheduled_at).getTime() >= now)
              .map((event) => ({
                id: event.id,
                applicationId: detail.id,
                companyName: detail.company_name,
                position: detail.position,
                type: event.event_type,
                at: event.scheduled_at,
              }));
          })
          .sort(
            (left, right) =>
              new Date(left.at).getTime() - new Date(right.at).getTime()
          )
          .slice(0, 5);

        setUpcoming(upcomingEvents);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [router]);

  const stageCounts = useMemo(() => {
    return applications.reduce<Record<string, number>>((acc, application) => {
      acc[application.current_stage] = (acc[application.current_stage] ?? 0) + 1;
      return acc;
    }, {});
  }, [applications]);

  const interviewCount = stageCounts.interview ?? 0;

  return (
    <AppShell
      title="Dashboard"
      description="Track outcomes and upcoming schedules from one screen."
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
            {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {!isLoading && upcoming.length === 0 ? (
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
            {!applications.length && !isLoading ? (
              <p className="text-sm text-slate-500">No applications yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
