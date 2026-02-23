import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <div className="relative">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-foreground">
            JobTrack
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/auth">로그인</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth">시작하기</Link>
            </Button>
          </div>
        </div>
      </nav>

      <header className="mx-auto w-full max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:pb-16 lg:pt-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both motion-reduce:animate-none">
            <p className="text-sm font-medium text-muted-foreground">
              지원 현황, 일정, 서류를 한 곳에서
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              취업 준비를
              <span className="text-muted-foreground">
                {" "}
                &ldquo;관리&rdquo;로 바꾸는
              </span>
              <br />
              가장 단순한 방법
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              칸반 보드로 파이프라인을 정리하고, 면접/코테 일정을 알림으로
              놓치지 마세요. 제출 서류(PDF)도 지원서별로 모아두면 복기까지
              쉬워집니다.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/auth">무료로 시작하기</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="sm:w-auto"
              >
                <a href="#features">기능 둘러보기</a>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              예정: 공고 URL을 붙여넣으면 AI가 자동으로 지원서 초안을 생성
              (Coming Soon)
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both motion-reduce:animate-none">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
              <p className="text-sm font-medium text-foreground">
                오늘의 흐름
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                지금 해야 할 일만 선명하게 보이도록
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-lg border border-border bg-muted p-4 transition-colors duration-200 hover:bg-accent">
                  <p className="text-sm font-medium text-foreground">
                    면접 D-1 리마인드
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    중요한 일정은 자동으로 알려드려요
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted p-4 transition-colors duration-200 hover:bg-accent">
                  <p className="text-sm font-medium text-foreground">
                    지원서 12개, 파이프라인 정리
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    단계별 병목을 한눈에 확인
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted p-4 transition-colors duration-200 hover:bg-accent">
                  <p className="text-sm font-medium text-foreground">
                    이력서/PDF 한 번에 관리
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    제출 서류를 지원서에 붙여두고 바로 꺼내보기
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
