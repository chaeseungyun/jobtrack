import { IScraperService, ScrapeResult } from "@/lib/core/services/interfaces/scraper.service";
// @ts-ignore
import { ScrapingBeeClient } from "scrapingbee";

export class ScrapingBeeScraper implements IScraperService {
  private client: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("ScrapingBee API key is required");
    }
    this.client = new ScrapingBeeClient(apiKey);
  }

  async scrape(url: string): Promise<ScrapeResult> {
    const response = await this.client.get({
      url,
      params: {
        render_js: true,
        block_ads: true,
        block_resources: true,
        wait: 500,
      },
    });

    const status = parseInt(response.headers["spb-initial-status-code"] || "200", 10);
    const html = Buffer.from(response.data).toString("utf-8");

    return {
      html,
      status,
      url,
      isBlocked: status === 403 || status === 429,
    };
  }
}
