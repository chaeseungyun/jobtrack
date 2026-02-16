import type { SupabaseClient } from "@supabase/supabase-js";
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

export const eventService = {
  async listByApplicationId(supabase: SupabaseClient, applicationId: string) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("application_id", applicationId)
      .order("scheduled_at", { ascending: true })
      .returns<EventRow[]>();

    if (error) throw error;
    return data ?? [];
  },

  async listUpcoming(supabase: SupabaseClient, applicationIds: string[]) {
    const { data, error } = await supabase
      .from("events")
      .select("id,application_id,event_type,scheduled_at")
      .in("application_id", applicationIds)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async create(supabase: SupabaseClient, input: CreateEventInput) {
    const { data, error } = await supabase
      .from("events")
      .insert(input)
      .select("*")
      .single();

    if (error) throw error;
    return data as EventRow;
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateEventInput) {
    const { data, error } = await supabase
      .from("events")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data as EventRow;
  },

  async remove(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  },
};
