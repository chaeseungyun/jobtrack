import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { applicationService } from "@/lib/services/application.service";
import { eventService } from "@/lib/services/event.service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  applicationsListQuerySchema,
  createApplicationSchema,
} from "@/lib/validation/step4";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const supabase = createServerSupabaseClient();

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryParsed = applicationsListQuerySchema.safeParse(params);

  if (!queryParsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  try {
    const data = await applicationService.list(supabase, auth.payload.sub, {
      stage: queryParsed.data.stage,
      search: queryParsed.data.search,
    });

    return NextResponse.json({ applications: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
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

  const supabase = createServerSupabaseClient();

  try {
    const application = await applicationService.create(
      supabase,
      auth.payload.sub,
      applicationInput
    );

    if (deadline) {
      await eventService.create(supabase, {
        application_id: application.id,
        event_type: "deadline",
        scheduled_at: deadline,
      });
    }

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
