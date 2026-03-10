import type { IAnalyticsRepository } from "@/lib/core/repositories/interfaces";
import type {
  DashboardAnalytics,
  BoardAnalytics,
  AnalyticsSummary,
  AnalyticsQueryParams,
} from "@/lib/core/analytics";

export class AnalyticsService {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  /** Dashboard 전체 분석 데이터 */
  async getDashboardAnalytics(
    userId: string,
    params?: AnalyticsQueryParams,
  ): Promise<DashboardAnalytics> {
    const range = params?.range ?? "30d";
    const [summary, funnel, trend, sourcePerformance] = await Promise.all([
      this.analyticsRepo.getSummary(userId),
      this.analyticsRepo.getStageFunnel(userId),
      this.analyticsRepo.getTrend(userId, range),
      this.analyticsRepo.getSourcePerformance(userId),
    ]);
    return { summary, funnel, trend, sourcePerformance };
  }

  /** Board 운영 지표 데이터 */
  async getBoardAnalytics(userId: string): Promise<BoardAnalytics> {
    const [conversions, stagnant] = await Promise.all([
      this.analyticsRepo.getStageConversions(userId),
      this.analyticsRepo.getStagnantApplications(userId, 14), // 14일 정체 기준
    ]);
    return { conversions, stagnant };
  }

  /** KPI 요약만 */
  async getSummary(userId: string): Promise<AnalyticsSummary> {
    return this.analyticsRepo.getSummary(userId);
  }
}
