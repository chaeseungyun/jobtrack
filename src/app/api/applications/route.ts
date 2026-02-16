import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
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
    let query = supabase
      .from("applications")
      .select("*")
      .eq("user_id", auth.payload.sub)
      .order("created_at", { ascending: false });

    if (queryParsed.data.stage) {
      query = query.eq("current_stage", queryParsed.data.stage);
    }

    if (queryParsed.data.search) {
      const keyword = queryParsed.data.search;
      query = query.or(
        `company_name.ilike.%${keyword}%,position.ilike.%${keyword}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications: data ?? [] });
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

  console.log(body)

  const parsed = createApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { deadline, ...applicationInput } = parsed.data;

  const supabase = createServerSupabaseClient();

  try {
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        ...applicationInput,
        user_id: auth.payload.sub,
      })
      .select("*")
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: applicationError?.message ?? "Failed to create application" },
        { status: 500 }
      );
    }

    if (deadline) {
      const { error: eventError } = await supabase.from("events").insert({
        application_id: application.id,
        event_type: "deadline",
        scheduled_at: deadline,
      });

      if (eventError) {
        return NextResponse.json({ error: eventError.message }, { status: 500 });
      }
    }

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
