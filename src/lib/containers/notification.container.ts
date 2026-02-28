import { SupabaseEventRepository } from "@/lib/core/repositories/supabase";
import { NotificationService } from "@/lib/core/services/NotificationService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createNotificationContainer() {
  const supabase = createServerSupabaseClient();
  const eventRepo = new SupabaseEventRepository(supabase);

  return {
    notificationService: new NotificationService(eventRepo),
  };
}
