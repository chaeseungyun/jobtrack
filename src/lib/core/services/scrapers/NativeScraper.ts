import {
  IScraperService,
  ScrapeResult,
} from "@/lib/core/services/interfaces/scraper.service";
import { AppError, notFound } from "../../errors";
import { isNetworkError } from "@/lib/utils/error";

export class NativeScraper implements IScraperService {
  async scrape(url: string): Promise<ScrapeResult> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          throw notFound(`공고가 존재하지 않습니다.`);
        }

        if (response.status >= 500) {
          throw new AppError(502, "UPSTREAM_ERROR", "Origin server error");
        }

        throw new AppError(response.status, "SCRAPE_FAILED", "Scrape failed");
      }

      const html = await response.text();

      return {
        html,
        status: response.status,
        url,
      };
    } catch (error) {
      // If fetch itself fails (e.g., network error), we throw to let the orchestrator handle it.
      if (isNetworkError(error)) {
        throw notFound(`도메인을 찾을 수 없습니다. URL을 다시 확인해주세요.`);
      }
      throw error;
    }
  }
}
