import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { signExtensionToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const token = signExtensionToken({
    sub: auth.payload.sub,
    email: auth.payload.email,
  });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return NextResponse.json({ token, expiresAt });
}
