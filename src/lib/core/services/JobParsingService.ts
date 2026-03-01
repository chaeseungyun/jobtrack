import { IJobCacheRepository } from "@/lib/core/repositories/interfaces/job-cache.repository";
import { ADAPTER_CONFIG, JobAdapterConfig } from "@/lib/core/config/adapter.config";
import { IScraperService, ScrapeResult } from "@/lib/core/services/interfaces/scraper.service";
import { IParsingService, ParsedJob } from "@/lib/core/services/interfaces/parser.service";

export class JobParsingService {
  constructor(
    private readonly cacheRepo: IJobCacheRepository,
    private readonly nativeScraper: IScraperService,
    private readonly spbScraper: IScraperService,
    private readonly parser: IParsingService
  ) {}

  async parseUrl(url: string): Promise<ParsedJob> {
    const cached = await this.cacheRepo.get(url);
    if (cached) {
      return cached.parsed_data as ParsedJob;
    }

    const hostname = new URL(url).hostname;
    const config = this.resolveAdapterConfig(hostname);

    let scrapeResult: ScrapeResult;
    
    try {
      scrapeResult = config.render_js
        ? await this.spbScraper.scrape(url)
        : await this.nativeScraper.scrape(url);

      // If we used NativeScraper and it failed our quality/security check, fallback to ScrapingBee
      if (!config.render_js && this.shouldRetryWithSpb(scrapeResult)) {
        scrapeResult = await this.spbScraper.scrape(url);
      }
    } catch (error) {
      // If NativeScraper threw a network error, try ScrapingBee as a last resort
      if (!config.render_js) {
        scrapeResult = await this.spbScraper.scrape(url);
      } else {
        throw error;
      }
    }

    const parsedData = await this.parser.parse(scrapeResult.html, config);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await this.cacheRepo.set(url, parsedData, expiresAt);

    return parsedData;
  }

  private resolveAdapterConfig(hostname: string): JobAdapterConfig {
    const adapterKeys = Object.keys(ADAPTER_CONFIG)
      .filter((key) => key !== "generic")
      .sort((a, b) => b.length - a.length);

    const matchedKey = adapterKeys.find(
      (key) => hostname === key || hostname.endsWith(`.${key}`)
    );

    return ADAPTER_CONFIG[matchedKey ?? "generic"] ?? ADAPTER_CONFIG.generic;
  }

  private shouldRetryWithSpb(result: ScrapeResult): boolean {
    const { html, status, isBlocked } = result;

    // 1. Explicit block status from scraper
    if (isBlocked || status === 403 || status === 429) return true;
    
    // 2. Suspiciously short content (likely a bot detection page or error)
    if (html.length < 1000) return true;
    
    // 3. Keyword-based block detection
    const lowercaseHtml = html.toLowerCase();
    const blockKeywords = ["captcha", "robot", "unusual activity", "security check"];
    if (blockKeywords.some(keyword => lowercaseHtml.includes(keyword))) {
      return true;
    }
    
    // 4. Other non-OK statuses (except 404/410 which are handled by the parser)
    if (status >= 400 && status !== 404 && status !== 410) return true;

    return false;
  }
}
