import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IEventRepository,
  CreateEventInput,
  UpdateEventInput,
  NotificationTarget,
  UpcomingEvent,
} from "@/lib/core/repositories/interfaces";
import type { EventRow } from "@/lib/supabase/types";

export class SupabaseEventRepository implements IEventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByApplicationId(applicationId: string): Promise<EventRow[]> {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("application_id", applicationId)
      .order("scheduled_at", { ascending: true })
      .returns<EventRow[]>();

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string): Promise<EventRow | null> {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as EventRow | null;
  }

  async findUpcoming(applicationIds: string[]): Promise<UpcomingEvent[]> {
    if (applicationIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("events")
      .select("id,application_id,event_type,scheduled_at")
      .in("application_id", applicationIds)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as UpcomingEvent[];
  }

  async findForNotification(
    daysBefore: number,
  ): Promise<NotificationTarget[]> {
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + daysBefore);
    const dateStr = targetDate.toISOString().split("T")[0];

    const notifiedColumn = daysBefore === 3 ? "notified_d3" : "notified_d1";

    const { data, error } = await this.supabase
      .from("events")
      .select(
        `
        *,
        applications!inner(
          company_name,
          position,
          users!inner(email)
        )
      `,
      )
      .eq(notifiedColumn, false)
      .gte("scheduled_at", `${dateStr}T00:00:00Z`)
      .lte("scheduled_at", `${dateStr}T23:59:59Z`)
      .returns<
        (EventRow & {
          applications: {
            company_name: string;
            position: string;
            users: { email: string };
          };
        })[]
      >();

    if (error) throw error;

    return (data ?? []).map((row) => ({
      event_id: row.id,
      application_id: row.application_id,
      event_type: row.event_type,
      scheduled_at: row.scheduled_at,
      company_name: row.applications.company_name,
      position: row.applications.position,
      user_email: row.applications.users.email,
    }));
  }

  async create(input: CreateEventInput): Promise<EventRow> {
    const { data, error } = await this.supabase
      .from("events")
      .insert(input)
      .select("*")
      .single();

    if (error) throw error;
    return data as EventRow;
  }

  async update(id: string, input: UpdateEventInput): Promise<EventRow> {
    const { data, error } = await this.supabase
      .from("events")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data as EventRow;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async confirmNotification(
    eventId: string,
    daysBefore: number,
  ): Promise<void> {
    const notifiedColumn = daysBefore === 3 ? "notified_d3" : "notified_d1";

    const { error } = await this.supabase
      .from("events")
      .update({ [notifiedColumn]: true })
      .eq("id", eventId);

    if (error) throw error;
  }
}
