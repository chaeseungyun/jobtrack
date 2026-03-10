import { SupabaseAnalyticsRepository } from "@/lib/core/repositories/supabase";
import { AnalyticsService } from "@/lib/core/services/AnalyticsService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createAnalyticsContainer() {
  const supabase = createServerSupabaseClient();
  const analyticsRepo = new SupabaseAnalyticsRepository(supabase);

  return {
    analyticsService: new AnalyticsService(analyticsRepo),
  };
}
