import {
  IScraperService,
  ScrapeResult,
} from "@/lib/core/services/interfaces/scraper.service";
// @ts-ignore
import { ScrapingBeeClient } from "scrapingbee";
import { AppError, notFound } from "../../errors";
import { isNetworkError } from "@/lib/utils/error";

export class ScrapingBeeScraper implements IScraperService {
  private client: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("ScrapingBee API key is required");
    }
    this.client = new ScrapingBeeClient(apiKey);
  }

  async scrape(url: string): Promise<ScrapeResult> {
    try {
      const response = await this.client.get({
        url,
        params: {
          render_js: true,
          block_ads: true,
          block_resources: true,
          wait: 500,
        },
      });

      if (response.status >= 500) {
        throw new AppError(
          502,
          "SCRAPINGBEE_API_ERROR",
          "ScrapingBee internal error",
        );
      }

      const status = parseInt(
        response.headers["spb-initial-status-code"] || "200",
        10,
      );

      if (status !== 200) {
        if (status === 404 || status === 410) {
          throw notFound(`공고가 존재하지 않습니다.`);
        }

        if (status >= 500) {
          throw new AppError(502, "UPSTREAM_ERROR", "Origin server error");
        }

        throw new AppError(
          status,
          "SCRAPE_FAILED",
          "Scrape failed with ScrapingBee",
        );
      }

      const html = Buffer.from(response.data).toString("utf-8");

      return {
        html,
        status,
        url,
      };
    } catch (error) {
      if (isNetworkError(error)) {
        throw notFound(`도메인을 찾을 수 없습니다. URL을 다시 확인해주세요.`);
      }
      throw error;
    }
  }
}
