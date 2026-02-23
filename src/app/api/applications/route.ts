import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/request";
import { createApplicationContainer } from "@/lib/containers/application.container";
import {
  applicationsListQuerySchema,
  createApplicationSchema,
} from "@/lib/validation/step4";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryParsed = applicationsListQuerySchema.safeParse(params);

  if (!queryParsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { applicationService } = createApplicationContainer();

  try {
    const data = await applicationService.list(auth.payload.sub, {
      stage: queryParsed.data.stage,
      search: queryParsed.data.search,
    });

    return NextResponse.json({ applications: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const body = await request
    .json()
    .catch(() => null as Record<string, unknown> | null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { deadline, ...applicationInput } = parsed.data;
  const { applicationService } = createApplicationContainer();

  try {
    const application = await applicationService.create(
      auth.payload.sub,
      applicationInput,
      deadline,
    );

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
