import { SupabaseUserRepository } from "@/lib/infrastructure/repositories";
import { AuthService } from "@/lib/services/AuthService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createAuthContainer() {
  const supabase = createServerSupabaseClient();
  const userRepo = new SupabaseUserRepository(supabase);

  return {
    authService: new AuthService(userRepo),
  };
}
