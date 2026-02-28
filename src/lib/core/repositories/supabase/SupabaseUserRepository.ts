import type { SupabaseClient } from "@supabase/supabase-js";

import type { IUserRepository } from "@/lib/core/repositories/interfaces";
import type { UserRow } from "@/lib/supabase/types";

export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    return data as UserRow | null;
  }

  async create(
    email: string,
    passwordHash: string,
  ): Promise<{ id: string; email: string }> {
    const { data, error } = await this.supabase
      .from("users")
      .insert({ email, password_hash: passwordHash })
      .select("id, email")
      .single();

    if (error) throw error;
    return data as { id: string; email: string };
  }
}
