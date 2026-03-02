import { SupabaseClient } from "@supabase/supabase-js";
import {
  IJobCacheRepository,
  JobParsingCacheRow,
} from "@/lib/core/repositories/interfaces/job-cache.repository";
import { CreateApplicationInput } from "@/lib/core/repositories/interfaces/application.repository";

export class SupabaseJobCacheRepository implements IJobCacheRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async get(url: string): Promise<JobParsingCacheRow | null> {
    const { data, error } = await this.supabase
      .from("job_parsing_cache")
      .select("*")
      .eq("url", url)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.log("failed to get cache from supabase:", error);
      // 캐시 조회 실패는 치명적이지 않으므로 에러를 로그로 남기고 null 반환
    }
    return data as JobParsingCacheRow | null;
  }

  async set(
    url: string,
    data: CreateApplicationInput & { deadline?: string | null },
    expiresAt: Date,
    contentHash?: string | null,
  ): Promise<void> {
    const { error } = await this.supabase.from("job_parsing_cache").upsert(
      {
        url,
        parsed_data: data,
        expires_at: expiresAt.toISOString(),
        content_hash: contentHash ?? null,
        last_fetched_at: new Date().toISOString(),
      },
      {
        onConflict: "url",
      },
    );

    if (error) {
      console.log("failed to set cache in supabase:", error);
      // 캐시 저장 실패는 치명적이지 않으므로 에러를 로그로 남기고 넘어감
    }
  }

  async deleteExpired(): Promise<void> {
    const { error } = await this.supabase
      .from("job_parsing_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;
  }
}
