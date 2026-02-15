import Link from "next/link";
import { notFound } from "next/navigation";

import { requireServerAuth } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApplicationRow, EventRow } from "@/lib/supabase/types";

import { ApplicationDetailForm } from "@/app/applications/[id]/_components/application-detail-form.client";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const auth = await requireServerAuth();
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.sub)
    .maybeSingle()
    .returns<ApplicationRow | null>();

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  if (!application) {
    notFound();
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .eq("application_id", id)
    .order("scheduled_at", { ascending: true })
    .returns<EventRow[]>();

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  return (
    <AppShell
      title="Application Detail"
      description="Review and update stage, notes, and links from a single view."
      activePath="/board"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link className="text-sm font-medium text-slate-700 underline" href="/board">
          Back to board
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ApplicationDetailForm initialApplication={application} />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(events ?? []).map((event) => (
              <div key={event.id} className="rounded-md border border-slate-200 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Badge variant="outline">{event.event_type}</Badge>
                  <span className="text-xs text-slate-500">
                    {DATE_FORMATTER.format(new Date(event.scheduled_at))}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{event.location ?? "-"}</p>
              </div>
            ))}
            {(events ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No events yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
