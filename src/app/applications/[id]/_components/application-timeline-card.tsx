import type { EventRow, EventType } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApplicationTimelineCardProps {
  events: EventRow[];
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  deadline: "마감",
  coding_test: "코딩 테스트",
  interview: "면접",
  result: "결과",
  etc: "기타",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getDaysLabel(scheduledAt: string): { label: string; variant: "default" | "destructive" | "secondary" } {
  const now = new Date();
  const target = new Date(scheduledAt);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `D+${Math.abs(diffDays)}`, variant: "secondary" };
  }
  if (diffDays === 0) {
    return { label: "D-Day", variant: "destructive" };
  }
  if (diffDays <= 3) {
    return { label: `D-${diffDays}`, variant: "destructive" };
  }
  return { label: `D-${diffDays}`, variant: "default" };
}

function getRelativeTime(scheduledAt: string): string {
  const now = new Date();
  const target = new Date(scheduledAt);
  const diffMs = target.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isPast = diffMs < 0;

  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 30) {
    const months = Math.floor(days / 30);
    return isPast ? `${months}개월 전` : `${months}개월 후`;
  }
  if (days > 0) {
    return isPast ? `${days}일 전` : `${days}일 후`;
  }
  if (hours > 0) {
    return isPast ? `${hours}시간 전` : `${hours}시간 후`;
  }
  return isPast ? "방금 전" : "곧";
}

export function ApplicationTimelineCard({ events }: ApplicationTimelineCardProps) {
  if (events.length === 0) {
    return null;
  }

  // 시간순 정렬 (오래된 것 먼저)
  const sorted = [...events].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>타임라인</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-border ml-2">
          {sorted.map((event) => {
            const isPast = new Date(event.scheduled_at).getTime() < Date.now();
            const dday = getDaysLabel(event.scheduled_at);
            const relative = getRelativeTime(event.scheduled_at);

            return (
              <li key={event.id} className="mb-6 ml-4 last:mb-0">
                <div
                  className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-background ${
                    isPast ? "bg-muted-foreground" : "bg-primary"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{EVENT_TYPE_LABELS[event.event_type]}</Badge>
                  <Badge variant={dday.variant}>{dday.label}</Badge>
                  <span className="text-xs text-muted-foreground">{relative}</span>
                </div>
                <time
                  className={`mt-1 block text-sm ${isPast ? "text-muted-foreground" : "font-medium text-foreground"}`}
                  dateTime={event.scheduled_at}
                  suppressHydrationWarning
                >
                  {DATE_FORMATTER.format(new Date(event.scheduled_at))}
                </time>
                {event.location ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{event.location}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
