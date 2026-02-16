import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { eventService } from "@/lib/services/event.service";
import { assertApplicationOwnership } from "@/lib/supabase/ownership";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createEventSchema } from "@/lib/validation/step4";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = requireAuth(_request);

  if (auth.ok === false) {
    return auth.response;
  }
  const { id } = await context.params;
  
  const supabase = createServerSupabaseClient();

  try {
    const isOwned = await assertApplicationOwnership(supabase, id, auth.payload.sub);

    if (!isOwned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await eventService.listByApplicationId(supabase, id);

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { id } = await context.params;
  const supabase = createServerSupabaseClient();

  try {
    const isOwned = await assertApplicationOwnership(supabase, id, auth.payload.sub);

    if (!isOwned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await eventService.create(supabase, {
      application_id: id,
      ...parsed.data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
