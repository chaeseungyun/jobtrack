import { applicationsApi } from "@/lib/api/client";
import type { EventRow } from "@/lib/supabase/types";

export const applicationDetailQueryKey = (id: string) => ["application-detail", id] as const;

export const applicationEventsQueryKey = (applicationId: string) =>
  ["application-events", applicationId] as const;

export const fetchApplicationEvents = async (applicationId: string): Promise<EventRow[]> => {
  const detail = await applicationsApi.get(applicationId);
  return detail.events;
};
