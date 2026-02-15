"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { applicationsApi } from "@/lib/api/client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import type { ApplicationRow, StageType } from "@/lib/supabase/types";

import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BoardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await applicationsApi.list();
        setApplications(result.applications);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load";
        if (message === "Unauthorized") {
          router.replace("/auth");
          return;
        }
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [router]);

  const grouped = useMemo(() => {
    const empty = STAGE_ORDER.reduce<Record<StageType, ApplicationRow[]>>(
      (acc, stage) => {
        acc[stage] = [];
        return acc;
      },
      {} as Record<StageType, ApplicationRow[]>
    );

    for (const application of applications) {
      empty[application.current_stage].push(application);
    }

    return empty;
  }, [applications]);

  return (
    <AppShell
      title="Kanban Board"
      description="See the whole pipeline by stage and focus on bottlenecks."
    >
      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? <p className="text-sm text-slate-500">Loading board...</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGE_ORDER.map((stage) => (
          <Card key={stage} className="h-full">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{STAGE_LABELS[stage]}</CardTitle>
                <Badge variant="secondary">{grouped[stage].length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[stage].map((application) => (
                <Link
                  key={application.id}
                  href={`/applications/${application.id}`}
                  className="block rounded-md border border-slate-200 p-3 transition hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-900">{application.company_name}</p>
                  <p className="text-sm text-slate-600">{application.position}</p>
                </Link>
              ))}
              {grouped[stage].length === 0 ? (
                <p className="text-sm text-slate-400">No items.</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
