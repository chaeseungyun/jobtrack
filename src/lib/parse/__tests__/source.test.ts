import { describe, it, expect } from "vitest";
import { inferSourceFromUrl } from "../source";

describe("inferSourceFromUrl", () => {
  it("should infer saramin for saramin.co.kr", () => {
    expect(inferSourceFromUrl("https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=123")).toBe("saramin");
    expect(inferSourceFromUrl("https://saramin.co.kr/zf_user/jobs/view?rec_idx=123")).toBe("saramin");
  });

  it("should infer jobkorea for jobkorea.co.kr", () => {
    expect(inferSourceFromUrl("https://www.jobkorea.co.kr/Recruit/GI_Read/123")).toBe("jobkorea");
    expect(inferSourceFromUrl("https://jobkorea.co.kr/Recruit/GI_Read/123")).toBe("jobkorea");
  });

  it("should fallback to etc for unknown domains", () => {
    expect(inferSourceFromUrl("https://google.com/jobs/123")).toBe("etc");
    expect(inferSourceFromUrl("https://wanted.co.kr/wd/123")).toBe("etc");
  });

  it("should fallback to etc for invalid URLs", () => {
    expect(inferSourceFromUrl("not-a-url")).toBe("etc");
  });
});
