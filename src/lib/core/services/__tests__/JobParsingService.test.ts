import { describe, it, expect, vi, beforeEach } from "vitest";
import { JobParsingService } from "../JobParsingService";
import { IJobCacheRepository } from "@/lib/core/repositories/interfaces/job-cache.repository";
import { IScraperService } from "@/lib/core/services/interfaces/scraper.service";
import { IParsingService } from "@/lib/core/services/interfaces/parser.service";

describe("JobParsingService", () => {
  let service: JobParsingService;
  let mockCacheRepo: IJobCacheRepository;
  let mockNativeScraper: IScraperService;
  let mockSpbScraper: IScraperService;
  let mockParser: IParsingService;

  beforeEach(() => {
    mockCacheRepo = {
      get: vi.fn(),
      set: vi.fn(),
      deleteExpired: vi.fn(),
    };
    mockNativeScraper = { scrape: vi.fn() };
    mockSpbScraper = { scrape: vi.fn() };
    mockParser = { parse: vi.fn() };

    service = new JobParsingService(
      mockCacheRepo,
      mockNativeScraper,
      mockSpbScraper,
      mockParser
    );
  });

  it("should return cached data if available", async () => {
    const url = "https://example.com/job";
    const cachedData = { company_name: "Cached Co", position: "Dev", career_type: "any" as const };
    
    vi.mocked(mockCacheRepo.get).mockResolvedValue({
      parsed_data: cachedData,
      id: "1",
      url,
      content_hash: null,
      last_fetched_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const result = await service.parseUrl(url);

    expect(result).toEqual(cachedData);
    expect(mockNativeScraper.scrape).not.toHaveBeenCalled();
  });

  it("should use native scraper and then parse if cache is empty", async () => {
    const url = "https://example.com/job";
    const html = "<html><body>Job Details</body></html>";
    const parsedData = { company_name: "New Co", position: "Manager", career_type: "experienced" as const };

    vi.mocked(mockCacheRepo.get).mockResolvedValue(null);
    vi.mocked(mockNativeScraper.scrape).mockResolvedValue({ html, status: 200, url });
    vi.mocked(mockParser.parse).mockResolvedValue(parsedData);

    const result = await service.parseUrl(url);

    expect(result).toEqual(parsedData);
    expect(mockNativeScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockCacheRepo.set).toHaveBeenCalled();
  });

  it("should fallback to ScrapingBee if native scraper is blocked", async () => {
    const url = "https://example.com/job";
    const blockedHtml = "<html><body>Access Denied (Captcha)</body></html>";
    const successHtml = "<html><body>Real Content</body></html>";
    const parsedData = { company_name: "Spb Co", position: "Lead", career_type: "any" as const };

    vi.mocked(mockCacheRepo.get).mockResolvedValue(null);
    vi.mocked(mockNativeScraper.scrape).mockResolvedValue({ html: blockedHtml, status: 403, url });
    vi.mocked(mockSpbScraper.scrape).mockResolvedValue({ html: successHtml, status: 200, url });
    vi.mocked(mockParser.parse).mockResolvedValue(parsedData);

    const result = await service.parseUrl(url);

    expect(result).toEqual(parsedData);
    expect(mockSpbScraper.scrape).toHaveBeenCalledWith(url);
  });
});
