"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getAuthToken } from "@/lib/auth/token";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    router.replace(token ? "/dashboard" : "/auth");
  }, [router]);

  return <div className="min-h-screen bg-slate-50" />;
}
