import type { UserRow } from "@/lib/supabase/types";

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRow | null>;
  create(
    email: string,
    passwordHash: string,
  ): Promise<{ id: string; email: string }>;
}
