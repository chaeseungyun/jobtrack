import { describe, it, expect, vi, beforeEach } from "vitest";
import { JobParsingService } from "../JobParsingService";
import { IJobCacheRepository } from "@/lib/core/repositories/interfaces/job-cache.repository";
import { IScraperService } from "@/lib/core/services/interfaces/scraper.service";
import { IParsingService } from "@/lib/core/services/interfaces/parser.service";
import { ADAPTER_CONFIG } from "@/lib/core/config/adapter.config";
import { AppError } from "@/lib/core/errors";

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
    expect(mockSpbScraper.scrape).not.toHaveBeenCalled();
    expect(mockParser.parse).not.toHaveBeenCalled();
  });

  it("should use native scraper and then parse if cache is empty", async () => {
    const url = "https://example.com/job";
    const html = `<html><body>${"Job Details ".repeat(150)}</body></html>`;
    const parsedData = { company_name: "New Co", position: "Manager", career_type: "experienced" as const };

    vi.mocked(mockCacheRepo.get).mockResolvedValue(null);
    vi.mocked(mockNativeScraper.scrape).mockResolvedValue({ html, status: 200, url });
    vi.mocked(mockParser.parse).mockResolvedValue(parsedData);

    const result = await service.parseUrl(url);

    expect(result).toEqual(parsedData);
    expect(mockNativeScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockSpbScraper.scrape).not.toHaveBeenCalled();
    expect(mockParser.parse).toHaveBeenCalledWith(html, ADAPTER_CONFIG.generic);
    expect(mockCacheRepo.set).toHaveBeenCalledWith(url, parsedData, expect.any(Date));
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
    expect(mockNativeScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockSpbScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockParser.parse).toHaveBeenCalledWith(successHtml, ADAPTER_CONFIG.generic);
  });

  it("should route directly to ScrapingBee when adapter requires JS rendering", async () => {
    const url = "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123";
    const html = "<html><body>Saramin Job</body></html>";
    const parsedData = { company_name: "Saramin", position: "FE", career_type: "any" as const };

    vi.mocked(mockCacheRepo.get).mockResolvedValue(null);
    vi.mocked(mockSpbScraper.scrape).mockResolvedValue({ html, status: 200, url });
    vi.mocked(mockParser.parse).mockResolvedValue(parsedData);

    const result = await service.parseUrl(url);

    expect(result).toEqual(parsedData);
    expect(mockNativeScraper.scrape).not.toHaveBeenCalled();
    expect(mockSpbScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockParser.parse).toHaveBeenCalledWith(html, ADAPTER_CONFIG["saramin.co.kr"]);
  });

  it("should NOT fallback to ScrapingBee if native scraper returns 404", async () => {
    const url = "https://example.com/job";
    const error = new AppError(404, "NOT_FOUND", "Not found");

    vi.mocked(mockCacheRepo.get).mockResolvedValue(null);
    vi.mocked(mockNativeScraper.scrape).mockRejectedValue(error);
    // isNotFoundError should return true for this error in the service layer

    await expect(service.parseUrl(url)).rejects.toThrow(error);
    expect(mockNativeScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockSpbScraper.scrape).not.toHaveBeenCalled();
  });

  it("should fallback to ScrapingBee if native scraper throws non-404 error", async () => {
    const url = "https://example.com/job";
    const nativeError = new AppError(502, "UPSTREAM_ERROR", "Native failed");
    const successHtml = "<html><body>ScrapingBee Content</body></html>";
    const parsedData = { company_name: "Fallback Co", position: "Dev", career_type: "any" as const };

    vi.mocked(mockCacheRepo.get).mockResolvedValue(null);
    vi.mocked(mockNativeScraper.scrape).mockRejectedValue(nativeError);
    vi.mocked(mockSpbScraper.scrape).mockResolvedValue({ html: successHtml, status: 200, url });
    vi.mocked(mockParser.parse).mockResolvedValue(parsedData);

    const result = await service.parseUrl(url);

    expect(result).toEqual(parsedData);
    expect(mockNativeScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockSpbScraper.scrape).toHaveBeenCalledWith(url);
    expect(mockParser.parse).toHaveBeenCalledWith(successHtml, ADAPTER_CONFIG.generic);
  });

  it("should handle cache failures gracefully (best-effort)", async () => {
    const url = "https://example.com/job";
    const html = `<html><body>${"Job Details ".repeat(150)}</body></html>`;
    const parsedData = { company_name: "CacheFail Co", position: "Dev", career_type: "any" as const };

    vi.mocked(mockCacheRepo.get).mockRejectedValue(new Error("DB Down"));
    vi.mocked(mockNativeScraper.scrape).mockResolvedValue({ html, status: 200, url });
    vi.mocked(mockParser.parse).mockResolvedValue(parsedData);
    vi.mocked(mockCacheRepo.set).mockRejectedValue(new Error("DB Still Down"));

    const result = await service.parseUrl(url);

    expect(result).toEqual(parsedData);
    expect(mockNativeScraper.scrape).toHaveBeenCalled();
    expect(mockParser.parse).toHaveBeenCalled();
  });
});
