import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { createNotificationContainer } from "@/lib/containers/notification.container";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { notificationService } = createNotificationContainer();

  try {
    const result = await notificationService.processReminders();
    return NextResponse.json({ processed: result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
