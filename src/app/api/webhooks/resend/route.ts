import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/services/email.service";
import { applicationService } from "@/lib/services/application.service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  try {
    const verified = emailService.verifyResendWebhook(headers, payload) as any;
    const { type, data } = verified;

    if (type === "email.delivered") {
      const tags = data.tags || {};
      const eventId = tags.eventId;
      const notificationType = tags.notificationType;

      if (eventId && (notificationType === "d1" || notificationType === "d3")) {
        const supabase = createServerSupabaseClient();
        const daysBefore = notificationType === "d3" ? 3 : 1;
        
        await applicationService.confirmNotification(supabase, eventId, daysBefore);
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verification failed" },
      { status: 400 }
    );
  }
}
