import { beforeAll, describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import {
  AUTH_COOKIE_NAME,
  signAuthToken,
  signExtensionToken,
} from "@/lib/auth/jwt";

type MockOptions = {
  cookie?: string | null;
  bearer?: string | null;
};

const mockRequest = ({ cookie, bearer }: MockOptions): NextRequest => {
  const headers = new Map<string, string>();
  if (bearer) {
    headers.set("authorization", `Bearer ${bearer}`);
  }

  const cookies = new Map<string, { name: string; value: string }>();
  if (cookie) {
    cookies.set(AUTH_COOKIE_NAME, { name: AUTH_COOKIE_NAME, value: cookie });
  }

  return {
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
    cookies: {
      get: (name: string) => cookies.get(name),
    },
  } as unknown as NextRequest;
};

describe("requireAuth", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-for-auth";
  });

  const validCookie = () => signAuthToken({ sub: "user-1", email: "u1@test" });
  const validBearer = () =>
    signExtensionToken({ sub: "user-2", email: "u2@test" });
  const FORGED = "forged.jwt.invalid";

  it("returns 401 when neither cookie nor bearer is present", async () => {
    const result = requireAuth(mockRequest({}));
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.response.status).toBe(401);
    }
  });

  it("authenticates web flow (valid cookie, no bearer)", () => {
    const result = requireAuth(mockRequest({ cookie: validCookie() }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.sub).toBe("user-1");
      expect(result.payload.email).toBe("u1@test");
    }
  });

  it("authenticates extension flow (valid bearer, no cookie)", () => {
    const result = requireAuth(mockRequest({ bearer: validBearer() }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.sub).toBe("user-2");
      expect(result.payload.email).toBe("u2@test");
    }
  });

  it("rejects forged bearer even when a valid cookie exists (regression for silent cookie fallback)", () => {
    const result = requireAuth(
      mockRequest({ cookie: validCookie(), bearer: FORGED }),
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.response.status).toBe(401);
    }
  });

  it("prefers bearer when both cookie and bearer are valid", () => {
    const result = requireAuth(
      mockRequest({ cookie: validCookie(), bearer: validBearer() }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.sub).toBe("user-2");
    }
  });

  it("returns 401 for forged bearer with no cookie", () => {
    const result = requireAuth(mockRequest({ bearer: FORGED }));
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.response.status).toBe(401);
    }
  });
});
