import { SupabaseClient } from "@supabase/supabase-js";
import { IJobCacheRepository, JobParsingCacheRow } from "@/lib/core/repositories/interfaces/job-cache.repository";
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

    if (error) throw error;
    return data as JobParsingCacheRow | null;
  }

  async set(
    url: string,
    data: CreateApplicationInput & { deadline?: string | null },
    expiresAt: Date,
    contentHash?: string | null
  ): Promise<void> {
    const { error } = await this.supabase
      .from("job_parsing_cache")
      .upsert({
        url,
        parsed_data: data,
        expires_at: expiresAt.toISOString(),
        content_hash: contentHash ?? null,
        last_fetched_at: new Date().toISOString(),
      }, {
        onConflict: "url",
      });

    if (error) throw error;
  }

  async deleteExpired(): Promise<void> {
    const { error } = await this.supabase
      .from("job_parsing_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;
  }
}
