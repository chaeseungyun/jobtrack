import { IJobCacheRepository } from "@/lib/core/repositories/interfaces/job-cache.repository";
import {
  ADAPTER_CONFIG,
  JobAdapterConfig,
} from "@/lib/core/config/adapter.config";
import {
  IScraperService,
  ScrapeResult,
} from "@/lib/core/services/interfaces/scraper.service";
import {
  IParsingService,
  ParsedJob,
} from "@/lib/core/services/interfaces/parser.service";
import { isNotFoundError } from "@/lib/utils/error";

export class JobParsingService {
  constructor(
    private readonly cacheRepo: IJobCacheRepository,
    private readonly nativeScraper: IScraperService,
    private readonly spbScraper: IScraperService,
    private readonly parser: IParsingService,
  ) {}

  async parseUrl(
    url: string,
    options: { bypassCache?: boolean } = {},
  ): Promise<ParsedJob> {
    if (!options.bypassCache) {
      try {
        const cached = await this.cacheRepo.get(url);
        if (cached) {
          return cached.parsed_data as ParsedJob;
        }
      } catch (error) {
        console.error("[JobParsingService] Cache get failed:", error);
      }
    }

    const hostname = new URL(url).hostname;
    const config = this.resolveAdapterConfig(hostname);

    const scrapeResult = await this.scrapWithFallback(url, config);
    const parsedData = await this.parser.parse(scrapeResult.html, config);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    try {
      await this.cacheRepo.set(url, parsedData, expiresAt);
    } catch (error) {
      console.error("[JobParsingService] Cache set failed:", error);
    }

    return parsedData;
  }

  private resolveAdapterConfig(hostname: string): JobAdapterConfig {
    const adapterKeys = Object.keys(ADAPTER_CONFIG)
      .filter((key) => key !== "generic")
      .sort((a, b) => b.length - a.length);

    const matchedKey = adapterKeys.find(
      (key) => hostname === key || hostname.endsWith(`.${key}`),
    );

    return ADAPTER_CONFIG[matchedKey ?? "generic"] ?? ADAPTER_CONFIG.generic;
  }

  private async scrapWithFallback(
    url: string,
    config: JobAdapterConfig,
  ): Promise<ScrapeResult> {
    if (config.render_js) {
      return await this.spbScraper.scrape(url); // 명백히 JS 렌더링이 필요한 사이트는 처음부터 ScrapingBee로 시도, nativeScraper는 시도조차 하지 않음
    }

    try {
      const nativeResult = await this.nativeScraper.scrape(url);

      if (this.shouldRetryWithSpb(nativeResult)) {
        return await this.spbScraper.scrape(url);
      }

      return nativeResult;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw error; // 404는 명백히 존재하지 않는 공고이므로 바로 throw
      }
      return await this.spbScraper.scrape(url);
    }
  }

  private shouldRetryWithSpb(result: ScrapeResult): boolean {
    const { html, status } = result;

    // 1. 403, 429는 명백한 봇 차단 신호이므로 바로 스크래핑비로 재시도
    if (status === 403 || status == 429) return true;

    // 2. Suspiciously short content (likely a bot detection page or error)
    if (html.length < 1000) return true;

    // 3. Keyword-based block detection
    const lowercaseHtml = html.toLowerCase();
    return ["captcha", "robot", "unusual activity", "security check"].some(
      (k) => lowercaseHtml.includes(k),
    );
  }
}
