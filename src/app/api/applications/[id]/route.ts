import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { applicationService } from "@/lib/services/application.service";
import { documentService } from "@/lib/services/document.service";
import { assertApplicationOwnership } from "@/lib/supabase/ownership";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateApplicationSchema } from "@/lib/validation/step4";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

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

    const [application, events, documents] = await Promise.all([
      applicationService.getById(supabase, id, auth.payload.sub),
      applicationService.listEventsByApplicationId(supabase, id),
      documentService.listByApplicationId(supabase, id),
    ]);

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...application,
      events,
      documents,
    });
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

  const body = await request
    .json()
    .catch(() => null as Record<string, unknown> | null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateApplicationSchema.safeParse(body);

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

    const { deadline, ...rest } = parsed.data;

    const updated = await applicationService.update(
      supabase,
      id,
      auth.payload.sub,
      { ...rest, deadline: deadline ?? undefined }
    );

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
    const isOwned = await assertApplicationOwnership(supabase, id, auth.payload.sub);

    if (!isOwned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await applicationService.remove(supabase, id, auth.payload.sub);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
