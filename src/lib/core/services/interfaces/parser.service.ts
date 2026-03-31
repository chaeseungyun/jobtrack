import { CreateApplicationInput } from "../../repositories/interfaces/application.repository";
import type { JobAdapterConfig } from "@/lib/core/config/adapter.config";

export interface ParsedJob extends CreateApplicationInput {
  deadline?: string | null;
}

export interface ParseOptions {
  preExtracted?: boolean;
}

export interface IParsingService {
  parse(
    html: string,
    config?: JobAdapterConfig,
    options?: ParseOptions,
  ): Promise<ParsedJob>;
}
