import Link from "next/link";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { requireServerAuth } from "@/lib/auth/session";
import { applicationEventsQueryKey } from "@/lib/query/applications";
import { applicationService } from "@/lib/services/application.service";
import { documentService } from "@/lib/services/document.service";
import { eventService } from "@/lib/services/event.service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DocumentRow, EventRow } from "@/lib/supabase/types";

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

  const [application, documents] = await Promise.all([
    applicationService.getById(supabase, id, auth.sub).catch(() => null),
    documentService.listByApplicationId(supabase, id),
  ]);

  if (!application) {
    notFound();
  }

  const events = await queryClient.fetchQuery<EventRow[]>({
    queryKey: applicationEventsQueryKey(id),
    queryFn: () => eventService.listByApplicationId(supabase, id),
  });

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
            initialDocuments={documents as DocumentRow[]}
          />

          <ApplicationEventsCard applicationId={id} />
        </div>
      </HydrationBoundary>
    </AppShell>
  );
}
