import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      database: "connected",
      applicationsCount: count ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error: message,
      },
      { status: 503 }
    );
  }
}
