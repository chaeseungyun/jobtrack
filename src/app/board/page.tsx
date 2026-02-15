import Link from "next/link";

import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import { requireServerAuth } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApplicationRow, StageType } from "@/lib/supabase/types";

import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BoardPage() {
  const auth = await requireServerAuth();
  const supabase = createServerSupabaseClient();

  let errorMessage: string | null = null;
  let applications: ApplicationRow[] = [];

  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", auth.sub)
      .order("created_at", { ascending: false })
      .returns<ApplicationRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    applications = data ?? [];
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load";
  }

  const grouped = STAGE_ORDER.reduce<Record<StageType, ApplicationRow[]>>(
    (acc, stage) => {
      acc[stage] = applications.filter((application) => application.current_stage === stage);
      return acc;
    },
    {} as Record<StageType, ApplicationRow[]>
  );

  return (
    <AppShell
      title="Kanban Board"
      description="See the whole pipeline by stage and focus on bottlenecks."
      activePath="/board"
    >
      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
