import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/request";
import { createAnalyticsContainer } from "@/lib/containers/analytics.container";
import { analyticsQuerySchema } from "@/lib/validation/analytics";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryParsed = analyticsQuerySchema.safeParse(params);

  if (!queryParsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { analyticsService } = createAnalyticsContainer();

  try {
    const data = await analyticsService.getDashboardAnalytics(
      auth.payload.sub,
      queryParsed.data,
    );
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
