import { type NextRequest, NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  type AuthTokenPayload,
  verifyAuthToken,
} from "@/lib/auth/jwt";

type AuthResult =
  | { ok: true; payload: AuthTokenPayload }
  | { ok: false; response: NextResponse };

export const requireAuth = (request: NextRequest): AuthResult => {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, payload };
};
