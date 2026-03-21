import { type NextRequest, NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  type AuthTokenPayload,
  verifyAuthToken,
} from "@/lib/auth/jwt";

type AuthResult =
  | { ok: true; payload: AuthTokenPayload }
  | { ok: false; response: NextResponse };

const extractToken = (request: NextRequest): string | null => {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

export const requireAuth = (request: NextRequest): AuthResult => {
  const token = extractToken(request);

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
