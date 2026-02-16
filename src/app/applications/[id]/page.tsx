import Link from "next/link";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { requireServerAuth } from "@/lib/auth/session";
import { applicationEventsQueryKey, fetchApplicationEvents } from "@/lib/query/applications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApplicationRow, DocumentRow, EventRow } from "@/lib/supabase/types";

import { ApplicationDetailForm } from "@/app/applications/[id]/_components/application-detail-form.client";
import { ApplicationEventsCard } from "@/app/applications/[id]/_components/application-events-card.client";
import { AppShell } from "@/components/app/app-shell";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const auth = await requireServerAuth();
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const queryClient = new QueryClient();

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

  const events = await queryClient.fetchQuery<EventRow[]>({
    queryKey: applicationEventsQueryKey(id),
    queryFn: () => fetchApplicationEvents(id),
  });

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  if (documentsError) {
    throw new Error(documentsError.message);
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

      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="grid gap-4 lg:grid-cols-5">
          <ApplicationDetailForm
            initialApplication={application}
            initialEvents={events}
            initialDocuments={documents ?? []}
          />

          <ApplicationEventsCard applicationId={id} />
        </div>
      </HydrationBoundary>
    </AppShell>
  );
}
