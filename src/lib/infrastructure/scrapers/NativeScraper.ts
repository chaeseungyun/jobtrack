import { IScraperService, ScrapeResult } from "@/lib/domain/services/scraper.service";

export class NativeScraper implements IScraperService {
  async scrape(url: string): Promise<ScrapeResult> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    // We allow 404/410 to be handled by the parser to detect expired jobs
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return {
      html,
      status: response.status,
      url,
    };
  }
}
