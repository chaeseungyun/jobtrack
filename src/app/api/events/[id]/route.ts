import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { applicationService } from "@/lib/services/application.service";
import { assertApplicationOwnership, assertEventOwnership } from "@/lib/supabase/ownership";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createEventSchema, updateEventSchema } from "@/lib/validation/step4";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id: applicationId } = await context.params;
  const body = await request
    .json()
    .catch(() => null as Record<string, unknown> | null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  try {
    const isOwned = await assertApplicationOwnership(supabase, applicationId, auth.payload.sub);

    if (!isOwned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await applicationService.createEvent(supabase, {
      application_id: applicationId,
      ...parsed.data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id: eventId } = await context.params;
  const body = await request
    .json()
    .catch(() => null as Record<string, unknown> | null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  try {
    const ownership = await assertEventOwnership(supabase, eventId, auth.payload.sub);

    if (!ownership.owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await applicationService.updateEvent(supabase, eventId, parsed.data);

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id: eventId } = await context.params;
  const supabase = createServerSupabaseClient();

  try {
    const ownership = await assertEventOwnership(supabase, eventId, auth.payload.sub);

    if (!ownership.owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await applicationService.removeEvent(supabase, eventId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
