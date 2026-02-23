import { Bell, FileText, KanbanSquare, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    title: "칸반 보드",
    description:
      "지원 단계를 한눈에 보고, 다음 액션이 막히는 지점을 빠르게 찾습니다.",
    Icon: KanbanSquare,
  },
  {
    title: "일정 리마인더",
    description:
      "면접/코테/마감 일정을 기준으로 D-3, D-1 알림으로 누락을 줄입니다.",
    Icon: Bell,
  },
  {
    title: "문서 관리",
    description:
      "지원서별 PDF(이력서/포트폴리오)를 모아두고 필요할 때 바로 꺼내봅니다.",
    Icon: FileText,
  },
  {
    title: "AI 공고 파싱 (예정)",
    description:
      "공고 URL만 넣으면 필드를 자동으로 채우는 흐름을 준비 중입니다.",
    Icon: Sparkles,
  },
] as const;

const DELAY_CLASS = ["", "delay-75", "delay-150", "delay-200"] as const;

export function LandingFeatures() {
  return (
    <section id="features" className="pt-16">
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both motion-reduce:animate-none">
        <p className="text-sm font-medium text-muted-foreground">핵심 기능</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          흩어진 정보를 하나로 모으는 도구
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          JobTrack은 지원서를 중심으로 일정과 문서를 함께 묶어, 취업 준비를
          &ldquo;기억&rdquo;이 아니라 &ldquo;시스템&rdquo;으로 바꿉니다.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, index) => (
          <Card
            key={feature.title}
            className={`group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both motion-reduce:animate-none transition-all hover:shadow-md hover:-translate-y-0.5 ${DELAY_CLASS[index]}`}
          >
            <CardHeader className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted transition-colors duration-200 group-hover:bg-accent">
                <feature.Icon className="h-5 w-5 text-foreground" />
              </div>
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
