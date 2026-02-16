import { eventsApi } from "@/lib/api/client";
import type { EventRow } from "@/lib/supabase/types";

export const applicationEventsQueryKey = (applicationId: string) =>
  ["application-events", applicationId] as const;

export const fetchApplicationEvents = async (applicationId: string): Promise<EventRow[]> => {
  return eventsApi.list(applicationId);
};
