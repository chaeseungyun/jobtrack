import type { Metadata } from "next";

import { LandingFeatures } from "@/components/app/landing-features";
import { LandingFooter } from "@/components/app/landing-footer";
import { LandingHero } from "@/components/app/landing-hero";
import { LandingPreview } from "@/components/app/landing-preview";
import { getServerAuthPayload } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "JobTrack",
  description:
    "칸반 보드로 지원 파이프라인을 정리하고, 중요한 면접/코테 일정을 알림으로 놓치지 마세요.",
};

export default async function HomePage() {
  const payload = await getServerAuthPayload();
  const isAuthenticated = payload !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <LandingHero isAuthenticated={isAuthenticated} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <LandingFeatures />
        <LandingPreview />
      </main>
      <LandingFooter />
    </div>
  );
}
