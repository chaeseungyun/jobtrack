import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
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

    const [{ data: application, error: applicationError }, { data: events, error: eventsError }, { data: documents, error: documentsError }] = await Promise.all([
      supabase.from("applications").select("*").eq("id", id).single(),
      supabase
        .from("events")
        .select("*")
        .eq("application_id", id)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("documents")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (applicationError || !application) {
      return NextResponse.json(
        { error: applicationError?.message ?? "Not found" },
        { status: 404 }
      );
    }

    if (eventsError || documentsError) {
      return NextResponse.json(
        { error: eventsError?.message ?? documentsError?.message ?? "Fetch failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...application,
      events: events ?? [],
      documents: documents ?? [],
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

    const { data, error } = await supabase
      .from("applications")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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

    const { error } = await supabase.from("applications").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
