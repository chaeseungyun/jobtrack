import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationRow, StageType, CareerType, SourceType } from "@/lib/supabase/types";

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
    const { data, error } = await supabase
      .from("applications")
      .update(input)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
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
};
