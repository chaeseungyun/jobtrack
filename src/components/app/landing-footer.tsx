import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LandingFooterProps {
  isAuthenticated: boolean;
}

export function LandingFooter({ isAuthenticated }: LandingFooterProps) {
  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">JobTrack</p>
            <p className="mt-1 text-sm text-muted-foreground">
              지원 현황을 한눈에, 일정은 놓치지 않게
            </p>
          </div>

          <Button asChild>
            <Link href={isAuthenticated ? "/dashboard" : "/auth?mode=register"}>
              {isAuthenticated ? "대시보드로 이동" : "무료로 시작하기"}
            </Link>
          </Button>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col justify-between gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>Built with Next.js, Supabase, Tailwind, shadcn/ui.</p>
          <div className="flex items-center gap-4">
            <Link
              className="transition-colors hover:text-foreground"
              href="/swagger"
            >
              API 문서
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href={isAuthenticated ? "/dashboard" : "/auth?mode=register"}
            >
              {isAuthenticated ? "대시보드" : "시작하기"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
