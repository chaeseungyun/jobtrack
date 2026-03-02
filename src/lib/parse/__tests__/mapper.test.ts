import { describe, it, expect } from "vitest";
import { mapParsedJobToFormPatch } from "../mapper";
import type { ParsedJob } from "../types";

describe("mapParsedJobToFormPatch", () => {
  it("should map all fields correctly for a full success result", () => {
    const parsed: ParsedJob = {
      company_name: "Google",
      position: "Software Engineer",
      career_type: "new",
      job_url: "https://google.com/jobs",
      source: "company",
      merit_tags: ["Remote", "High Salary"],
      current_stage: "applied",
      company_memo: "Great company",
      cover_letter: "I love Google",
      deadline: "2026-03-10T15:00:00Z",
    };

    const result = mapParsedJobToFormPatch(parsed);

    expect(result).toEqual({
      company_name: "Google",
      position: "Software Engineer",
      career_type: "new",
      job_url: "https://google.com/jobs",
      source: "company",
      merit_tags: "Remote, High Salary",
      current_stage: "applied",
      company_memo: "Great company",
      cover_letter: "I love Google",
      deadline: "2026-03-10T15:00",
    });
  });

  it("should map partial fields and handle null/undefined values", () => {
    const parsed: ParsedJob = {
      company_name: "Apple",
      position: "Frontend Developer",
      career_type: "experienced",
      job_url: null,
      source: null,
      merit_tags: [],
      // current_stage missing
      company_memo: undefined,
      cover_letter: null,
      deadline: null,
    };

    const result = mapParsedJobToFormPatch(parsed);

    expect(result).toEqual({
      company_name: "Apple",
      position: "Frontend Developer",
      career_type: "experienced",
      job_url: "",
      source: "none",
      merit_tags: "",
      company_memo: "",
      cover_letter: "",
      deadline: "",
    });
    expect(result).not.toHaveProperty("current_stage");
  });

  it("should handle empty result by providing default empty strings for optional fields", () => {
    const parsed: Partial<ParsedJob> = {};

    const result = mapParsedJobToFormPatch(parsed as ParsedJob);

    expect(result).toEqual({
      company_name: "",
      position: "",
      job_url: "",
      source: "none",
      merit_tags: "",
      company_memo: "",
      cover_letter: "",
      deadline: "",
    });
    expect(result).not.toHaveProperty("career_type");
    expect(result).not.toHaveProperty("current_stage");
  });

});
