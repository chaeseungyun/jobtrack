import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsApi } from "../client";
import type {
  AnalyticsSummary,
  StageFunnelItem,
  DashboardAnalytics,
  BoardAnalytics,
} from "@/lib/core/analytics";

const mockSummary: AnalyticsSummary = {
  totalApplications: 10,
  responseRate: 50,
  documentPassRate: 40,
  interviewRate: 30,
  finalPassRate: 10,
  weeklyApplicationCount: 3,
  activeApplications: 7,
};

const mockFunnel: StageFunnelItem[] = [
  { stage: "interest", count: 2 },
  { stage: "applied", count: 5 },
  { stage: "document_pass", count: 2 },
  { stage: "assignment", count: 0 },
  { stage: "interview", count: 1 },
  { stage: "final_pass", count: 0 },
  { stage: "rejected", count: 0 },
];

describe("analyticsApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should call dashboard endpoint without params and return data", async () => {
    const mockData: DashboardAnalytics = {
      summary: mockSummary,
      funnel: mockFunnel,
      trend: [{ date: "2026-03-10", count: 2 }],
      sourcePerformance: [
        { source: "linkedin", total: 4, documentPassRate: 50, interviewRate: 25, finalPassRate: 0 },
      ],
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as unknown as Response);

    const result = await analyticsApi.dashboard();

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      "/api/analytics/dashboard",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("should append range query for dashboard endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        summary: mockSummary,
        funnel: mockFunnel,
        trend: [],
        sourcePerformance: [],
      }),
    } as unknown as Response);

    await analyticsApi.dashboard({ range: "7d" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/analytics/dashboard?range=7d",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("should call board endpoint and return data", async () => {
    const mockData: BoardAnalytics = {
      conversions: [{ fromStage: "applied", toStage: "document_pass", rate: 50, count: 2 }],
      stagnant: [
        {
          applicationId: "app-1",
          companyName: "Acme",
          stage: "applied",
          daysSinceUpdate: 18,
        },
      ],
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as unknown as Response);

    const result = await analyticsApi.board();

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      "/api/analytics/board",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("should throw when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "server failed" }),
    } as unknown as Response);

    await expect(analyticsApi.dashboard()).rejects.toThrow("server failed");
  });
});
