"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchApplicationEvents, applicationEventsQueryKey } from "@/lib/query/applications";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApplicationEventsCardProps {
  applicationId: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ApplicationEventsCard({ applicationId }: ApplicationEventsCardProps) {
  const { data: events = [] } = useQuery({
    queryKey: applicationEventsQueryKey(applicationId),
    queryFn: () => fetchApplicationEvents(applicationId),
    staleTime: 30 * 1000,
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => (
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
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No events yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
