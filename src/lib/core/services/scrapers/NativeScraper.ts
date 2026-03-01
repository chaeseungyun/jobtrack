import { IScraperService, ScrapeResult } from "@/lib/core/services/interfaces/scraper.service";

export class NativeScraper implements IScraperService {
  async scrape(url: string): Promise<ScrapeResult> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    // NativeScraper should return the response status and content without throwing,
    // so that the orchestrator (JobParsingService) can decide whether to retry with ScrapingBee.
    // We only throw if the request itself failed to execute (e.g., network error).


    const html = await response.text();

    return {
      html,
      status: response.status,
      url,
      isBlocked: response.status === 403 || response.status === 429,
    };
  }
}
