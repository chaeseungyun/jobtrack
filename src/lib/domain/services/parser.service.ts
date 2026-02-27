import { CreateApplicationInput } from "../repositories/application.repository";

export interface ParsedJob extends CreateApplicationInput {
  deadline?: string | null;
}

export interface IParsingService {
  parse(html: string): Promise<ParsedJob>;
}
