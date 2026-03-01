import { IJobCacheRepository } from "@/lib/core/repositories/interfaces/job-cache.repository";
import { ADAPTER_CONFIG, JobAdapterConfig } from "@/lib/core/config/adapter.config";
import { IScraperService } from "@/lib/core/services/interfaces/scraper.service";
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

    let scrapeResult = config.render_js
      ? await this.spbScraper.scrape(url)
      : await this.nativeScraper.scrape(url);

    if (
      !config.render_js &&
      (scrapeResult.isBlocked === true ||
        scrapeResult.html.length < 1000 ||
        this.shouldRetryWithSpb(scrapeResult.html, scrapeResult.status))
    ) {
      scrapeResult = await this.spbScraper.scrape(url);
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

  private shouldRetryWithSpb(html: string, status: number): boolean {
    if (status === 403 || status === 429) return true;
    
    if (html.length < 1000) return true;
    
    const lowercaseHtml = html.toLowerCase();
    if (
      lowercaseHtml.includes("captcha") || 
      lowercaseHtml.includes("robot") || 
      lowercaseHtml.includes("unusual activity") ||
      lowercaseHtml.includes("security check")
    ) {
      return true;
    }
    
    return false;
  }
}
