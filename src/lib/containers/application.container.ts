import { SupabaseApplicationRepository } from "@/lib/infrastructure/repositories";
import { SupabaseEventRepository } from "@/lib/infrastructure/repositories";
import { ApplicationService } from "@/lib/services/ApplicationService";
import { EventService } from "@/lib/services/EventService";
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
