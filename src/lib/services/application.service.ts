import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationRow,
  StageType,
  CareerType,
  SourceType,
  EventRow,
  EventType,
} from "@/lib/supabase/types";

export interface CreateApplicationInput {
  company_name: string;
  position: string;
  career_type: CareerType;
  job_url?: string | null;
  source?: SourceType | null;
  merit_tags?: string[];
  current_stage?: StageType;
  company_memo?: string | null;
  cover_letter?: string | null;
}

export interface UpdateApplicationInput {
  company_name?: string;
  position?: string;
  career_type?: CareerType;
  job_url?: string | null;
  source?: SourceType | null;
  merit_tags?: string[];
  current_stage?: StageType;
  company_memo?: string | null;
  cover_letter?: string | null;
  deadline?: string | null;
}

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

export const applicationService = {
  async list(
    supabase: SupabaseClient,
    userId: string,
    params: { stage?: StageType; search?: string } = {}
  ) {
    let query = supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (params.stage) {
      query = query.eq("current_stage", params.stage);
    }

    if (params.search) {
      query = query.or(
        `company_name.ilike.%${params.search}%,position.ilike.%${params.search}%`
      );
    }

    const { data, error } = await query.returns<ApplicationRow[]>();
    if (error) throw error;
    return data ?? [];
  },

  async getById(supabase: SupabaseClient, id: string, userId: string) {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data as ApplicationRow;
  },

  async create(supabase: SupabaseClient, userId: string, input: CreateApplicationInput) {
    const { data, error } = await supabase
      .from("applications")
      .insert({
        ...input,
        user_id: userId,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as ApplicationRow;
  },

  async update(supabase: SupabaseClient, id: string, userId: string, input: UpdateApplicationInput) {
    const { deadline, ...applicationUpdate } = input;

    const { data, error } = await supabase
      .from("applications")
      .update(applicationUpdate)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;

    if (deadline !== undefined) {
      const events = await applicationService.listEventsByApplicationId(supabase, id);
      const existingDeadline = events.find((e) => e.event_type === "deadline");

      if (deadline && existingDeadline) {
        await applicationService.updateEvent(supabase, existingDeadline.id, { scheduled_at: deadline });
      } else if (deadline && !existingDeadline) {
        await applicationService.createEvent(supabase, {
          application_id: id,
          event_type: "deadline",
          scheduled_at: deadline,
        });
      } else if (!deadline && existingDeadline) {
        await applicationService.removeEvent(supabase, existingDeadline.id);
      }
    }

    return data as ApplicationRow;
  },

  async remove(supabase: SupabaseClient, id: string, userId: string) {
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  },

  async listEventsByApplicationId(supabase: SupabaseClient, applicationId: string) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("application_id", applicationId)
      .order("scheduled_at", { ascending: true })
      .returns<EventRow[]>();

    if (error) throw error;
    return data ?? [];
  },

  async listUpcomingEvents(supabase: SupabaseClient, applicationIds: string[]) {
    const { data, error } = await supabase
      .from("events")
      .select("id,application_id,event_type,scheduled_at")
      .in("application_id", applicationIds)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async createEvent(supabase: SupabaseClient, input: CreateEventInput) {
    const { data, error } = await supabase
      .from("events")
      .insert(input)
      .select("*")
      .single();

    if (error) throw error;
    return data as EventRow;
  },

  async updateEvent(supabase: SupabaseClient, id: string, input: UpdateEventInput) {
    const { data, error } = await supabase
      .from("events")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data as EventRow;
  },

  async removeEvent(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  },

  async findEventsForNotification(supabase: SupabaseClient, daysBefore: number) {
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + daysBefore);
    const dateStr = targetDate.toISOString().split("T")[0];

    const notifiedColumn = daysBefore === 3 ? "notified_d3" : "notified_d1";

    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        applications!inner(
          company_name,
          position,
          users!inner(email)
        )
      `)
      .eq(notifiedColumn, false)
      .gte("scheduled_at", `${dateStr}T00:00:00Z`)
      .lte("scheduled_at", `${dateStr}T23:59:59Z`)
      .returns<(EventRow & { 
        applications: { 
          company_name: string; 
          position: string; 
          users: { email: string } 
        } 
      })[]>();

    if (error) throw error;
    return data ?? [];
  },

  async confirmNotification(supabase: SupabaseClient, eventId: string, daysBefore: number) {
    const notifiedColumn = daysBefore === 3 ? "notified_d3" : "notified_d1";

    const { error } = await supabase
      .from("events")
      .update({ [notifiedColumn]: true })
      .eq("id", eventId);

    if (error) throw error;
  },
};

