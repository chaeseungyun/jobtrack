import { NextResponse } from "next/server";

import { AppError } from "@/lib/core/errors";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Internal server error";

  return NextResponse.json({ error: message }, { status: 500 });
}
