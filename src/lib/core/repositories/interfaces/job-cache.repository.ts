import { CreateApplicationInput } from "./application.repository";

export interface JobParsingCacheRow {
  id: string;
  url: string;
  content_hash: string | null;
  parsed_data: CreateApplicationInput & { deadline?: string | null };
  last_fetched_at: string;
  expires_at: string;
  created_at: string;
}

export interface IJobCacheRepository {
  get(url: string): Promise<JobParsingCacheRow | null>;
  set(
    url: string,
    data: CreateApplicationInput & { deadline?: string | null },
    expiresAt: Date,
    contentHash?: string | null
  ): Promise<void>;
  deleteExpired(): Promise<void>;
}
