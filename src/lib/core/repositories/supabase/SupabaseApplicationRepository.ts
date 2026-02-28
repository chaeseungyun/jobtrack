import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IApplicationRepository,
  CreateApplicationInput,
  UpdateApplicationInput,
} from "@/lib/core/repositories/interfaces";
import type { ApplicationRow, StageType } from "@/lib/supabase/types";

export class SupabaseApplicationRepository implements IApplicationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findMany(
    userId: string,
    params?: { stage?: StageType; search?: string },
  ): Promise<ApplicationRow[]> {
    let query = this.supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (params?.stage) {
      query = query.eq("current_stage", params.stage);
    }

    if (params?.search) {
      query = query.or(
        `company_name.ilike.%${params.search}%,position.ilike.%${params.search}%`,
      );
    }

    const { data, error } = await query.returns<ApplicationRow[]>();
    if (error) throw error;
    return data ?? [];
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<ApplicationRow | null> {
    const { data, error } = await this.supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as ApplicationRow | null;
  }

  async existsForUser(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("applications")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async create(
    userId: string,
    input: CreateApplicationInput,
  ): Promise<ApplicationRow> {
    const { data, error } = await this.supabase
      .from("applications")
      .insert({ ...input, user_id: userId })
      .select("*")
      .single();

    if (error) throw error;
    return data as ApplicationRow;
  }

  async update(
    id: string,
    userId: string,
    input: UpdateApplicationInput,
  ): Promise<ApplicationRow> {
    const { data, error } = await this.supabase
      .from("applications")
      .update(input)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data as ApplicationRow;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  }
}
