import { SupabaseEventRepository } from "@/lib/infrastructure/repositories";
import { NotificationService } from "@/lib/services/NotificationService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createNotificationContainer() {
  const supabase = createServerSupabaseClient();
  const eventRepo = new SupabaseEventRepository(supabase);

  return {
    notificationService: new NotificationService(eventRepo),
  };
}
