import type { SupabaseClient } from "@supabase/supabase-js";

import type { IAnalyticsRepository } from "@/lib/core/repositories/interfaces";
import type {
  StageFunnelItem,
  TrendItem,
  SourcePerformance,
  StageConversion,
  StagnantApplication,
  AnalyticsSummary,
} from "@/lib/core/analytics";
import type { StageType, SourceType } from "@/lib/supabase/types";
import { STAGE_ORDER } from "@/lib/app/stages";

export class SupabaseAnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 단계별 지원서 수 집계
   */
  async getStageFunnel(userId: string): Promise<StageFunnelItem[]> {
    const { data, error } = await this.supabase
      .from("applications")
      .select("current_stage")
      .eq("user_id", userId);

    if (error) throw error;

    const applications = data ?? [];

    // Client-side grouping
    const stageCountMap = new Map<StageType, number>();
    for (const app of applications) {
      const stage = app.current_stage as StageType;
      stageCountMap.set(stage, (stageCountMap.get(stage) ?? 0) + 1);
    }

    return STAGE_ORDER.map((stage) => ({
      stage,
      count: stageCountMap.get(stage) ?? 0,
    }));
  }

  /**
   * 일별 지원 추이 (기간 필터)
   */
  async getTrend(
    userId: string,
    range: "7d" | "30d" | "90d" | "all",
  ): Promise<TrendItem[]> {
    let query = this.supabase
      .from("applications")
      .select("created_at")
      .eq("user_id", userId);

    // Range filter
    if (range !== "all") {
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const daysAgo = daysMap[range];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      query = query.gte("created_at", cutoffDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const applications = data ?? [];

    // Client-side grouping by date
    const dateCountMap = new Map<string, number>();
    for (const app of applications) {
      const dateStr = app.created_at.split("T")[0]; // YYYY-MM-DD
      dateCountMap.set(dateStr, (dateCountMap.get(dateStr) ?? 0) + 1);
    }

    // Sort by date ascending
    const trendItems: TrendItem[] = Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trendItems;
  }

  /**
   * 출처별 성과 통계
   */
  async getSourcePerformance(userId: string): Promise<SourcePerformance[]> {
    const { data, error } = await this.supabase
      .from("applications")
      .select("source, current_stage")
      .eq("user_id", userId);

    if (error) throw error;

    const applications = data ?? [];

    // Group by source
    const sourceMap = new Map<
      SourceType | "unknown",
      { total: number; stages: StageType[] }
    >();

    for (const app of applications) {
      const source = (app.source as SourceType | null) ?? "unknown";
      const stage = app.current_stage as StageType;

      if (!sourceMap.has(source)) {
        sourceMap.set(source, { total: 0, stages: [] });
      }
      const entry = sourceMap.get(source)!;
      entry.total += 1;
      entry.stages.push(stage);
    }

    // Calculate rates for each source
    const result: SourcePerformance[] = [];
    for (const [source, { total, stages }] of sourceMap.entries()) {
      const documentPassRate = this.safeRate(
        stages.filter((s) => this.isStageOrBeyond(s, "document_pass")).length,
        total,
      );
      const interviewRate = this.safeRate(
        stages.filter((s) => this.isStageOrBeyond(s, "interview")).length,
        total,
      );
      const finalPassRate = this.safeRate(
        stages.filter((s) => s === "final_pass").length,
        total,
      );

      result.push({
        source,
        total,
        documentPassRate,
        interviewRate,
        finalPassRate,
      });
    }

    return result;
  }

  /**
   * 단계별 전환율 데이터
   */
  async getStageConversions(userId: string): Promise<StageConversion[]> {
    const { data, error } = await this.supabase
      .from("applications")
      .select("current_stage")
      .eq("user_id", userId);

    if (error) throw error;

    const applications = data ?? [];
    const stages = applications.map((app) => app.current_stage as StageType);

    // Calculate consecutive stage conversions
    const conversions: StageConversion[] = [];

    // Sequential progression (excluding "rejected")
    const sequentialStages = STAGE_ORDER.filter((s) => s !== "rejected");

    for (let i = 0; i < sequentialStages.length - 1; i++) {
      const fromStage = sequentialStages[i];
      const toStage = sequentialStages[i + 1];

      const fromCount = stages.filter((s) =>
        this.isStageOrBeyond(s, fromStage),
      ).length;
      const toCount = stages.filter((s) =>
        this.isStageOrBeyond(s, toStage),
      ).length;

      conversions.push({
        fromStage,
        toStage,
        rate: this.safeRate(toCount, fromCount),
        count: toCount,
      });
    }

    return conversions;
  }

  /**
   * 정체 지원서 목록 (N일 이상 업데이트 없음)
   */
  async getStagnantApplications(
    userId: string,
    thresholdDays: number,
  ): Promise<StagnantApplication[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

    const { data, error } = await this.supabase
      .from("applications")
      .select("id, company_name, current_stage, updated_at")
      .eq("user_id", userId)
      .lt("updated_at", cutoffDate.toISOString())
      .not("current_stage", "in", '("rejected","final_pass")');

    if (error) throw error;

    const applications = data ?? [];

    return applications.map((app) => {
      const updatedAt = new Date(app.updated_at);
      const daysSinceUpdate = Math.floor(
        (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        applicationId: app.id,
        companyName: app.company_name,
        stage: app.current_stage as StageType,
        daysSinceUpdate,
      };
    });
  }

  /**
   * KPI 요약 통계
   */
  async getSummary(userId: string): Promise<AnalyticsSummary> {
    const { data, error } = await this.supabase
      .from("applications")
      .select("current_stage, created_at")
      .eq("user_id", userId);

    if (error) throw error;

    const applications = data ?? [];
    const stages = applications.map((app) => app.current_stage as StageType);

    const totalApplications = applications.length;

    // Response rate: % of "applied" that moved beyond "applied"
    const appliedCount = stages.filter((s) =>
      this.isStageOrBeyond(s, "applied"),
    ).length;
    const beyondAppliedCount = stages.filter((s) =>
      this.isStageOrBeyond(s, "document_pass"),
    ).length;
    const responseRate = this.safeRate(beyondAppliedCount, appliedCount);

    // Pass rates
    const documentPassRate = this.safeRate(
      stages.filter((s) => this.isStageOrBeyond(s, "document_pass")).length,
      totalApplications,
    );
    const interviewRate = this.safeRate(
      stages.filter((s) => this.isStageOrBeyond(s, "interview")).length,
      totalApplications,
    );
    const finalPassRate = this.safeRate(
      stages.filter((s) => s === "final_pass").length,
      totalApplications,
    );

    // Weekly count
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyApplicationCount = applications.filter(
      (app) => new Date(app.created_at) >= sevenDaysAgo,
    ).length;

    // Active applications (exclude rejected/final_pass)
    const activeApplications = stages.filter(
      (s) => s !== "rejected" && s !== "final_pass",
    ).length;

    return {
      totalApplications,
      responseRate,
      documentPassRate,
      interviewRate,
      finalPassRate,
      weeklyApplicationCount,
      activeApplications,
    };
  }

  /**
   * Helper: Safe rate calculation
   */
  private safeRate(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100);
  }

  /**
   * Helper: Check if stage is at or beyond target stage
   * Uses STAGE_ORDER for comparison (excludes "rejected" from sequential logic)
   */
  private isStageOrBeyond(stage: StageType, targetStage: StageType): boolean {
    // If stage is "rejected", it's not part of the sequential progression
    if (stage === "rejected" || targetStage === "rejected") {
      return false;
    }
    const sequentialStages = STAGE_ORDER.filter((s) => s !== "rejected");
    const stageIndex = sequentialStages.indexOf(stage);
    const targetIndex = sequentialStages.indexOf(targetStage);
    return stageIndex >= targetIndex && stageIndex !== -1;
  }
}
