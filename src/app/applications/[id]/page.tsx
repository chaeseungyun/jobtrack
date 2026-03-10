import Link from "next/link";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { requireServerAuth } from "@/lib/auth/session";
import { createApplicationContainer } from "@/lib/containers/application.container";
import { createDocumentContainer } from "@/lib/containers/document.container";
import { applicationDetailQueryKey } from "@/lib/query/applications";

import { ApplicationDetailForm } from "@/app/applications/[id]/_components/application-detail-form.client";
import { ApplicationEventsCard } from "@/app/applications/[id]/_components/application-events-card.client";
import { AppShell } from "@/components/app/app-shell";
import { ApplicationTimelineCard } from "@/app/applications/[id]/_components/application-timeline-card";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params;
  const auth = await requireServerAuth(`/applications/${id}`);
  const { applicationService } = createApplicationContainer();
  const { documentService } = createDocumentContainer();
  const queryClient = new QueryClient();

  const applicationDetail = await queryClient.fetchQuery({
    queryKey: applicationDetailQueryKey(id),
    queryFn: async () => {
      const [applicationWithEvents, documents] = await Promise.all([
        applicationService.getDetail(id, auth.sub),
        documentService.listByApplicationId(auth.sub, id),
      ]);

      return {
        ...applicationWithEvents,
        documents,
      };
    },
  });

  if (!applicationDetail) {
    notFound();
  }

  return (
    <AppShell
      title="지원서 상세"
      description="단계, 메모, 링크를 한 화면에서 확인하고 수정하세요."
      activePath="/board"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link className="text-sm font-medium text-muted-foreground underline" href="/board">
          보드로 돌아가기
        </Link>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="grid gap-4 lg:grid-cols-5">
          <ApplicationDetailForm
            initialApplication={applicationDetail}
          />

          <ApplicationEventsCard applicationId={id} />
        </div>
      </HydrationBoundary>

      {applicationDetail.events && applicationDetail.events.length > 0 ? (
        <div className="mt-6">
          <ApplicationTimelineCard events={applicationDetail.events} />
        </div>
      ) : null}
    </AppShell>
  );
}
