import type { EventRow, EventType } from "@/lib/supabase/types";

export interface CreateEventInput {
  application_id: string;
  event_type: EventType;
  scheduled_at: string;
  location?: string | null;
  interview_round?: number | null;
}

export interface UpdateEventInput {
  event_type?: EventType;
  scheduled_at?: string;
  location?: string | null;
  interview_round?: number | null;
}

export interface NotificationTarget {
  event_id: string;
  application_id: string;
  event_type: EventType;
  scheduled_at: string;
  company_name: string;
  position: string;
  user_email: string;
}

export type UpcomingEvent = Pick<
  EventRow,
  "id" | "application_id" | "event_type" | "scheduled_at"
>;

export interface IEventRepository {
  findByApplicationId(applicationId: string): Promise<EventRow[]>;
  findById(id: string): Promise<EventRow | null>;
  findUpcoming(applicationIds: string[]): Promise<UpcomingEvent[]>;
  findForNotification(daysBefore: number): Promise<NotificationTarget[]>;
  create(input: CreateEventInput): Promise<EventRow>;
  update(id: string, input: UpdateEventInput): Promise<EventRow>;
  remove(id: string): Promise<void>;
  confirmNotification(eventId: string, daysBefore: number): Promise<void>;
}
