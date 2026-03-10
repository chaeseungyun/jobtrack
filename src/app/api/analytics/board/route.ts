import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/request";
import { createAnalyticsContainer } from "@/lib/containers/analytics.container";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { analyticsService } = createAnalyticsContainer();

  try {
    const data = await analyticsService.getBoardAnalytics(auth.payload.sub);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
