import "server-only";

import jwt, { type JwtPayload } from "jsonwebtoken";

const JWT_EXPIRES_IN = "7d";
export const AUTH_COOKIE_NAME = "jobtrack_auth";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface AuthClaims {
  sub: string;
  email: string;
}

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
}

const getJwtSecret = (): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }

  return jwtSecret;
};

export const signAuthToken = (claims: AuthClaims): string => {
  return jwt.sign(claims, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
};

export const verifyAuthToken = (token: string): AuthTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded === "string") {
      return null;
    }

    if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") {
      return null;
    }

    return decoded as AuthTokenPayload;
  } catch {
    return null;
  }
};
