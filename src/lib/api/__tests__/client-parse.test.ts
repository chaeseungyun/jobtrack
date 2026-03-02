import { describe, it, expect, vi, beforeEach } from "vitest";
import { applicationsApi } from "../client";

describe("applicationsApi.parse", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should return parsed job data on success", async () => {
    const mockData = {
      company_name: "Test Company",
      position: "Software Engineer",
      career_type: "NEW",
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as unknown as Response);

    const result = await applicationsApi.parse("https://example.com/job");

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      "/api/applications/parse",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com/job",
          bypassCache: undefined,
        }),
      }),
    );
  });

  it("should send bypassCache when provided", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown as Response);

    await applicationsApi.parse("https://example.com/job", {
      bypassCache: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/applications/parse",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com/job",
          bypassCache: true,
        }),
      }),
    );
  });

  it("should throw error for invalid URL format", async () => {
    await expect(applicationsApi.parse("abc")).rejects.toThrow(
      "올바른 URL 형식이 아닙니다",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should throw error for empty URL", async () => {
    await expect(applicationsApi.parse("")).rejects.toThrow(
      "URL을 입력해주세요",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should throw UX friendly error on 500", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    } as unknown as Response);

    await expect(
      applicationsApi.parse("https://example.com/job"),
    ).rejects.toThrow(
      "파싱 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    );
  });
});
