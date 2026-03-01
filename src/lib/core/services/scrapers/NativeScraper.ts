import { IScraperService, ScrapeResult } from "@/lib/core/services/interfaces/scraper.service";

export class NativeScraper implements IScraperService {
  async scrape(url: string): Promise<ScrapeResult> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    // We allow 404/410 to be handled by the parser to detect expired jobs
    if (!response.ok && ![403, 404, 410, 429].includes(response.status)) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    return {
      html,
      status: response.status,
      url,
      isBlocked: response.status === 403 || response.status === 429,
    };
  }
}
