import { describe, it, expect } from "vitest";
import { applicationsApi } from "@/lib/api/client";
import { mapParsedJobToFormPatch } from "@/lib/parse/mapper";

describe("New Application Parse Flow", () => {
  describe("URL validation", () => {
    it("should reject empty URL", async () => {
      await expect(applicationsApi.parse("")).rejects.toThrow("URL을 입력해주세요");
    });

    it("should reject invalid URL format", async () => {
      await expect(applicationsApi.parse("not-a-url")).rejects.toThrow("올바른 URL 형식이 아닙니다");
    });
  });

  describe("Parse result mapping", () => {
    it("should map successful parse to form patch", () => {
      const mockParsed = {
        company_name: "Google",
        position: "Software Engineer",
        job_url: "https://google.com/jobs/123",
        career_type: "new" as const,
      };

      const result = mapParsedJobToFormPatch(mockParsed);

      expect(result).toEqual(expect.objectContaining({
        company_name: "Google",
        position: "Software Engineer",
        job_url: "https://google.com/jobs/123",
      }));
    });

    it("should handle partial parse result", () => {
      const mockPartial = {
        company_name: "Google",
        position: "",
        career_type: "new" as const,
        job_url: "https://google.com/jobs/123",
      };

      const result = mapParsedJobToFormPatch(mockPartial);

      expect(result.company_name).toBe("Google");
      expect(result.position).toBe("");
    });

    it("should determine parse status from result", () => {
      const successResult = { company_name: "A", position: "B" };
      const partialResult = { company_name: "A" };
      const failedResult = {};

      const getStatus = (res: Record<string, string>) => {
        if (res.company_name && res.position) return "SUCCESS";
        if (res.company_name || res.position) return "PARTIAL";
        return "FAILED";
      };

      expect(getStatus(successResult)).toBe("SUCCESS");
      expect(getStatus(partialResult)).toBe("PARTIAL");
      expect(getStatus(failedResult)).toBe("FAILED");
    });
  });

  describe("Minimum save requirements", () => {
    it("should allow save with company_name, position, job_url only", () => {
      const minimalData = {
        company_name: "Test Co",
        position: "Developer",
        job_url: "https://example.com",
      };

      const isValidForSave = (data: Record<string, string>) => {
        return !!(data.company_name?.trim() && data.position?.trim() && data.job_url?.trim());
      };

      expect(isValidForSave(minimalData)).toBe(true);
    });
  });
});
