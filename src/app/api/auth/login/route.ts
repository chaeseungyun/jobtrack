import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  signAuthToken,
} from "@/lib/auth/jwt";
import { createAuthContainer } from "@/lib/containers/auth.container";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginRequestBody {
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { authService } = createAuthContainer();

  try {
    const user = await authService.login(email, password);

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
