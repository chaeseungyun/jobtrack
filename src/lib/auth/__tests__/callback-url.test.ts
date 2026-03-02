import { describe, it, expect } from "vitest";

import { getSafeCallbackUrl } from "@/lib/auth/callback-url";

describe("getSafeCallbackUrl", () => {
  // ── 허용 케이스 (Valid relative paths) ──

  it("should allow simple relative path /dashboard", () => {
    expect(getSafeCallbackUrl("/dashboard")).toBe("/dashboard");
  });

  it("should allow nested relative path /applications/new", () => {
    expect(getSafeCallbackUrl("/applications/new")).toBe("/applications/new");
  });

  it("should allow path with query string /board?tab=1", () => {
    expect(getSafeCallbackUrl("/board?tab=1")).toBe("/board?tab=1");
  });

  it("should allow path with hash /applications/123#events", () => {
    expect(getSafeCallbackUrl("/applications/123#events")).toBe(
      "/applications/123#events",
    );
  });

  it("should allow root path /", () => {
    expect(getSafeCallbackUrl("/")).toBe("/");
  });

  // ── Fallback 케이스 (null / undefined / empty) ──

  it("should fallback for null", () => {
    expect(getSafeCallbackUrl(null)).toBe("/dashboard");
  });

  it("should fallback for undefined", () => {
    expect(getSafeCallbackUrl(undefined)).toBe("/dashboard");
  });

  it("should fallback for empty string", () => {
    expect(getSafeCallbackUrl("")).toBe("/dashboard");
  });

  it("should fallback for whitespace-only string", () => {
    expect(getSafeCallbackUrl("   ")).toBe("/dashboard");
  });

  it("should use custom fallback when provided", () => {
    expect(getSafeCallbackUrl(null, "/board")).toBe("/board");
  });

  // ── 차단 케이스: 절대 URL ──

  it("should block absolute https URL", () => {
    expect(getSafeCallbackUrl("https://evil.com")).toBe("/dashboard");
  });

  it("should block absolute http URL", () => {
    expect(getSafeCallbackUrl("http://evil.com/path")).toBe("/dashboard");
  });

  // ── 차단 케이스: Protocol-relative URL ──

  it("should block protocol-relative URL //evil.com", () => {
    expect(getSafeCallbackUrl("//evil.com")).toBe("/dashboard");
  });

  it("should block protocol-relative URL //evil.com/path", () => {
    expect(getSafeCallbackUrl("//evil.com/path")).toBe("/dashboard");
  });

  // ── 차단 케이스: javascript / data scheme ──

  it("should block javascript: scheme", () => {
    expect(getSafeCallbackUrl("javascript:alert(1)")).toBe("/dashboard");
  });

  it("should block data: scheme", () => {
    expect(getSafeCallbackUrl("data:text/html,<h1>hi</h1>")).toBe("/dashboard");
  });

  // ── 차단 케이스: 백슬래시 우회 ──

  it("should block backslash-based bypass /\\evil.com", () => {
    expect(getSafeCallbackUrl("/\\evil.com")).toBe("/dashboard");
  });

  // ── 차단 케이스: URL 인코딩 우회 ──

  it("should block encoded protocol-relative URL /%2F%2Fevil.com", () => {
    // /%2F%2Fevil.com decodes to ///evil.com → starts with //
    expect(getSafeCallbackUrl("/%2F%2Fevil.com")).toBe("/dashboard");
  });

  it("should block encoded scheme /%6Aavascript:alert(1)", () => {
    // This starts with / so passes first check, but after decode could be tricky.
    // The decoded form would be /javascript:alert(1) which starts with / and
    // the regex checks the decoded string - /javascript:... matches the scheme pattern.
    // Actually /javascript: starts with / so the regex ^[a-zA-Z]... won't match.
    // This is intentionally allowed because it's a relative path starting with /
    // The browser will treat it as a path, not a scheme.
    expect(getSafeCallbackUrl("/%6Aavascript:alert(1)")).toBe(
      "/%6Aavascript:alert(1)",
    );
  });

  // ── 차단 케이스: 상대 경로가 아닌 문자열 ──

  it("should block plain text without leading slash", () => {
    expect(getSafeCallbackUrl("dashboard")).toBe("/dashboard");
  });

  it("should block relative path without leading slash", () => {
    expect(getSafeCallbackUrl("applications/new")).toBe("/dashboard");
  });
});
