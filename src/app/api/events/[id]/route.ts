import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { eventService } from "@/lib/services/event.service";
import { assertEventOwnership } from "@/lib/supabase/ownership";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateEventSchema } from "@/lib/validation/step4";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { id } = await context.params;
  const supabase = createServerSupabaseClient();

  try {
    const ownership = await assertEventOwnership(supabase, id, auth.payload.sub);

    if (!ownership.owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await eventService.update(supabase, id, parsed.data);

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

  const { id } = await context.params;
  const supabase = createServerSupabaseClient();

  try {
    const ownership = await assertEventOwnership(supabase, id, auth.payload.sub);

    if (!ownership.owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await eventService.remove(supabase, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
