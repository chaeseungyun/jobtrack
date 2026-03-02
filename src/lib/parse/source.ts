import type { SourceType } from "@/lib/supabase/types";

/**
 * Infers the job application source based on the URL hostname.
 * 
 * Rules:
 * - saramin.co.kr -> saramin
 * - jobkorea.co.kr -> jobkorea
 * - everything else -> etc
 */
export function inferSourceFromUrl(url: string): SourceType {
  try {
    const hostname = new URL(url).hostname;
    
    if (hostname === "saramin.co.kr" || hostname.endsWith(".saramin.co.kr")) {
      return "saramin";
    }
    
    if (hostname === "jobkorea.co.kr" || hostname.endsWith(".jobkorea.co.kr")) {
      return "jobkorea";
    }
    
    return "etc";
  } catch {
    return "etc";
  }
}
