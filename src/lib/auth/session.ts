import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, type AuthTokenPayload, verifyAuthToken } from "@/lib/auth/jwt";

export const getServerAuthPayload = async (): Promise<AuthTokenPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
};

export const requireServerAuth = async (): Promise<AuthTokenPayload> => {
  const payload = await getServerAuthPayload();

  if (!payload) {
    redirect("/auth");
  }

  return payload;
};
