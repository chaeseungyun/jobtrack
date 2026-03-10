import type { AnalyticsSummary } from "@/lib/core/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardKpiCardsProps {
  summary: AnalyticsSummary;
}

function RateValue({ value, suffix = "%" }: { value: number; suffix?: string }) {
  return (
    <p
      className={`text-3xl font-semibold ${
        value > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground"
      }`}
    >
      {value}
      <span className="text-lg">{suffix}</span>
    </p>
  );
}

export function DashboardKpiCards({ summary }: DashboardKpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card aria-label={`전체 지원 ${summary.totalApplications}건`}>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">전체 지원</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">
            {summary.totalApplications}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            이번 주 지원: {summary.weeklyApplicationCount}건
          </p>
        </CardContent>
      </Card>

      <Card aria-label={`응답률 ${summary.responseRate}%`}>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">응답률</CardTitle>
        </CardHeader>
        <CardContent>
          <RateValue value={summary.responseRate} />
        </CardContent>
      </Card>

      <Card aria-label={`서류합격률 ${summary.documentPassRate}%`}>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">서류합격률</CardTitle>
        </CardHeader>
        <CardContent>
          <RateValue value={summary.documentPassRate} />
        </CardContent>
      </Card>

      <Card aria-label={`면접전환율 ${summary.interviewRate}%`}>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">면접전환율</CardTitle>
        </CardHeader>
        <CardContent>
          <RateValue value={summary.interviewRate} />
        </CardContent>
      </Card>

      <Card aria-label={`최종합격률 ${summary.finalPassRate}%`}>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">최종합격률</CardTitle>
        </CardHeader>
        <CardContent>
          <RateValue value={summary.finalPassRate} />
          <p className="mt-1 text-xs text-muted-foreground">
            진행중: {summary.activeApplications}건
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
