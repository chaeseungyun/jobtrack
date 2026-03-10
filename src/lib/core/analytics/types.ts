import type { StageType, SourceType } from "@/lib/supabase/types";

/** 단계별 지원서 수 (퍼널용) */
export interface StageFunnelItem {
  stage: StageType;
  count: number;
}

/** 일별/주별 지원 추이 */
export interface TrendItem {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number;
}

/** 출처별 성과 */
export interface SourcePerformance {
  source: SourceType | "unknown";
  total: number;
  documentPassRate: number; // 0-100
  interviewRate: number; // 0-100
  finalPassRate: number; // 0-100
}

/** 단계별 전환율 (board용) */
export interface StageConversion {
  fromStage: StageType;
  toStage: StageType;
  rate: number; // 0-100
  count: number;
}

/** 정체 지원서 (board용) */
export interface StagnantApplication {
  applicationId: string;
  companyName: string;
  stage: StageType;
  daysSinceUpdate: number;
}

/** KPI 요약 (dashboard용) */
export interface AnalyticsSummary {
  totalApplications: number;
  responseRate: number; // 0-100 (applied 이후 반응 비율)
  documentPassRate: number; // 0-100
  interviewRate: number; // 0-100
  finalPassRate: number; // 0-100
  weeklyApplicationCount: number;
  activeApplications: number; // rejected/final_pass 제외
}

/** Dashboard 분석 전체 응답 */
export interface DashboardAnalytics {
  summary: AnalyticsSummary;
  funnel: StageFunnelItem[];
  trend: TrendItem[];
  sourcePerformance: SourcePerformance[];
}

/** Board 운영 지표 응답 */
export interface BoardAnalytics {
  conversions: StageConversion[];
  stagnant: StagnantApplication[];
}

/** 분석 API query 파라미터 */
export interface AnalyticsQueryParams {
  range?: "7d" | "30d" | "90d" | "all";
}
