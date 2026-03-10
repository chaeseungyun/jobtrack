import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "../AnalyticsService";
import type { IAnalyticsRepository } from "@/lib/core/repositories/interfaces/analytics.repository";
import type {
  AnalyticsSummary,
  StageFunnelItem,
  TrendItem,
  SourcePerformance,
  StageConversion,
  StagnantApplication,
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

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let mockAnalyticsRepo: IAnalyticsRepository;

  beforeEach(() => {
    mockAnalyticsRepo = {
      getStageFunnel: vi.fn(),
      getTrend: vi.fn(),
      getSourcePerformance: vi.fn(),
      getStageConversions: vi.fn(),
      getStagnantApplications: vi.fn(),
      getSummary: vi.fn(),
    };

    service = new AnalyticsService(mockAnalyticsRepo);
  });

  it("should call all dashboard repo methods and return dashboard analytics with default range", async () => {
    const userId = "user-1";
    const mockTrend: TrendItem[] = [{ date: "2026-03-10", count: 2 }];
    const mockSourcePerformance: SourcePerformance[] = [
      { source: "linkedin", total: 4, documentPassRate: 50, interviewRate: 25, finalPassRate: 0 },
    ];

    vi.mocked(mockAnalyticsRepo.getSummary).mockResolvedValue(mockSummary);
    vi.mocked(mockAnalyticsRepo.getStageFunnel).mockResolvedValue(mockFunnel);
    vi.mocked(mockAnalyticsRepo.getTrend).mockResolvedValue(mockTrend);
    vi.mocked(mockAnalyticsRepo.getSourcePerformance).mockResolvedValue(mockSourcePerformance);

    const result = await service.getDashboardAnalytics(userId);

    expect(mockAnalyticsRepo.getSummary).toHaveBeenCalledWith(userId);
    expect(mockAnalyticsRepo.getStageFunnel).toHaveBeenCalledWith(userId);
    expect(mockAnalyticsRepo.getTrend).toHaveBeenCalledWith(userId, "30d");
    expect(mockAnalyticsRepo.getSourcePerformance).toHaveBeenCalledWith(userId);
    expect(result).toEqual({
      summary: mockSummary,
      funnel: mockFunnel,
      trend: mockTrend,
      sourcePerformance: mockSourcePerformance,
    });
  });

  it("should pass custom range through to getTrend", async () => {
    const userId = "user-1";

    vi.mocked(mockAnalyticsRepo.getSummary).mockResolvedValue(mockSummary);
    vi.mocked(mockAnalyticsRepo.getStageFunnel).mockResolvedValue(mockFunnel);
    vi.mocked(mockAnalyticsRepo.getTrend).mockResolvedValue([]);
    vi.mocked(mockAnalyticsRepo.getSourcePerformance).mockResolvedValue([]);

    await service.getDashboardAnalytics(userId, { range: "7d" });

    expect(mockAnalyticsRepo.getTrend).toHaveBeenCalledWith(userId, "7d");
  });

  it("should call board repo methods and return board analytics", async () => {
    const userId = "user-1";
    const mockConversions: StageConversion[] = [
      { fromStage: "applied", toStage: "document_pass", rate: 40, count: 2 },
    ];
    const mockStagnant: StagnantApplication[] = [
      { applicationId: "app-1", companyName: "Acme", stage: "applied", daysSinceUpdate: 20 },
    ];

    vi.mocked(mockAnalyticsRepo.getStageConversions).mockResolvedValue(mockConversions);
    vi.mocked(mockAnalyticsRepo.getStagnantApplications).mockResolvedValue(mockStagnant);

    const result = await service.getBoardAnalytics(userId);

    expect(mockAnalyticsRepo.getStageConversions).toHaveBeenCalledWith(userId);
    expect(mockAnalyticsRepo.getStagnantApplications).toHaveBeenCalledWith(userId, 14);
    expect(result).toEqual({ conversions: mockConversions, stagnant: mockStagnant });
  });

  it("should delegate getSummary to analyticsRepo.getSummary", async () => {
    const userId = "user-1";

    vi.mocked(mockAnalyticsRepo.getSummary).mockResolvedValue(mockSummary);

    const result = await service.getSummary(userId);

    expect(mockAnalyticsRepo.getSummary).toHaveBeenCalledWith(userId);
    expect(result).toEqual(mockSummary);
  });
});
