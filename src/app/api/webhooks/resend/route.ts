import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { createNotificationContainer } from "@/lib/containers/notification.container";
import { emailService } from "@/lib/core/services/email.service";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return new NextResponse("Missing headers", { status: 400 });
  }

  try {
    const event = emailService.verifyResendWebhook({
      id,
      timestamp,
      signature,
    }, payload);

    if (event.type === "email.delivered") {
      const { eventId, notificationType } = event.data.tags || {};

      if (eventId && (notificationType === "d1" || notificationType === "d3")) {
        const { notificationService } = createNotificationContainer();
        await notificationService.confirmWebhookNotification(eventId, notificationType);
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
