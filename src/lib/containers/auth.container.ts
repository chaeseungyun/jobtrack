import { SupabaseUserRepository } from "@/lib/core/repositories/supabase";
import { AuthService } from "@/lib/core/services/AuthService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createAuthContainer() {
  const supabase = createServerSupabaseClient();
  const userRepo = new SupabaseUserRepository(supabase);

  return {
    authService: new AuthService(userRepo),
  };
}
