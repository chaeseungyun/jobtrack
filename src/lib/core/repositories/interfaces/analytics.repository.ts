import type {
  StageFunnelItem,
  TrendItem,
  SourcePerformance,
  StageConversion,
  StagnantApplication,
  AnalyticsSummary,
} from "@/lib/core/analytics";

export interface IAnalyticsRepository {
  /** 단계별 지원서 수 집계 */
  getStageFunnel(userId: string): Promise<StageFunnelItem[]>;

  /** 일별 지원 추이 (기간 필터) */
  getTrend(
    userId: string,
    range: "7d" | "30d" | "90d" | "all",
  ): Promise<TrendItem[]>;

  /** 출처별 성과 통계 */
  getSourcePerformance(userId: string): Promise<SourcePerformance[]>;

  /** 단계별 전환율 데이터 */
  getStageConversions(userId: string): Promise<StageConversion[]>;

  /** 정체 지원서 목록 (N일 이상 업데이트 없음) */
  getStagnantApplications(
    userId: string,
    thresholdDays: number,
  ): Promise<StagnantApplication[]>;

  /** KPI 요약 통계 */
  getSummary(userId: string): Promise<AnalyticsSummary>;
}
