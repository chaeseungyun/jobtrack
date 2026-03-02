export interface ScrapeResult {
  html: string;
  status: number;
  url: string;
}

export interface IScraperService {
  scrape(url: string): Promise<ScrapeResult>;
}
