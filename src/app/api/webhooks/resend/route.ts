import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { createNotificationContainer } from "@/lib/containers/notification.container";
import { emailService } from "@/lib/services/email.service";

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
        const { notificationService } = createNotificationContainer();
        await notificationService.confirmWebhookNotification(
          eventId,
          notificationType,
        );
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
