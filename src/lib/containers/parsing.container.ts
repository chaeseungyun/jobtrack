import { SupabaseJobCacheRepository } from "@/lib/core/repositories/supabase";
import { NativeScraper } from "@/lib/core/services/scrapers/NativeScraper";
import { ScrapingBeeScraper } from "@/lib/core/services/scrapers/ScrapingBeeScraper";
import { OpenAiParsingService } from "@/lib/core/services/llm/OpenAiParsingService";
import { JobParsingService } from "@/lib/core/services/JobParsingService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createParsingContainer() {
  const supabase = createServerSupabaseClient();
  const cacheRepo = new SupabaseJobCacheRepository(supabase);
  
  const nativeScraper = new NativeScraper();
  const spbScraper = new ScrapingBeeScraper(process.env.SCRAPINGBEE_API_KEY!);
  const parser = new OpenAiParsingService(process.env.OPENAI_API_KEY!);

  return {
    jobParsingService: new JobParsingService(
      cacheRepo,
      nativeScraper,
      spbScraper,
      parser
    ),
  };
}
