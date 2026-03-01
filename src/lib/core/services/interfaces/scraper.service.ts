export interface ScrapeResult {
  html: string;
  status: number;
  url: string;
  isBlocked?: boolean;
}

export interface IScraperService {
  scrape(url: string): Promise<ScrapeResult>;
}
