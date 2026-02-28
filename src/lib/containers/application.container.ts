import { SupabaseApplicationRepository } from "@/lib/core/repositories/supabase";
import { SupabaseEventRepository } from "@/lib/core/repositories/supabase";
import { ApplicationService } from "@/lib/core/services/ApplicationService";
import { EventService } from "@/lib/core/services/EventService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createApplicationContainer() {
  const supabase = createServerSupabaseClient();
  const applicationRepo = new SupabaseApplicationRepository(supabase);
  const eventRepo = new SupabaseEventRepository(supabase);

  return {
    applicationService: new ApplicationService(applicationRepo, eventRepo),
    eventService: new EventService(eventRepo, applicationRepo),
  };
}
