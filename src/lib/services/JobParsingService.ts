import { IJobCacheRepository } from "@/lib/domain/repositories/job-cache.repository";
import { IScraperService } from "@/lib/domain/services/scraper.service";
import { IParsingService, ParsedJob } from "@/lib/domain/services/parser.service";

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

    let scrapeResult = await this.nativeScraper.scrape(url);

    if (this.shouldRetryWithSpb(scrapeResult.html, scrapeResult.status)) {
      scrapeResult = await this.spbScraper.scrape(url);
    }

    const parsedData = await this.parser.parse(scrapeResult.html);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await this.cacheRepo.set(url, parsedData, expiresAt);

    return parsedData;
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
