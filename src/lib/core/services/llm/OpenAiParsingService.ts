import {
  IParsingService,
  ParsedJob,
} from "@/lib/core/services/interfaces/parser.service";
import { ADAPTER_CONFIG } from "@/lib/core/config/adapter.config";
import type { JobAdapterConfig } from "@/lib/core/config/adapter.config";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import TurndownService from "turndown";
import * as cheerio from "cheerio";
import { AppError } from "../../errors";

/**
 * Helper to handle LLM's tendency to return "null" as a string.
 */
const llmString = z
  .string()
  .transform((val) => (val.trim().toLowerCase() === "null" ? "" : val.trim()));

const JobSchema = z.object({
  company_name: llmString.describe("기업 공식 명칭"),
  position: llmString.describe("채용 포지션명"),
  career_type: z
    .enum(["new", "experienced", "any"])
    .describe("신입, 경력, 무관 중 하나"),
  merit_tags: z
    .array(z.string())
    .max(10)
    .describe("복지, 기술스택, 근무환경 등 주요 키워드"),
  company_memo: llmString.describe("요구 기술 스택, 자격 요건, 우대 사항 요약"),
  deadline: z
    .string()
    .nullable()
    .transform((val) => (val?.trim().toLowerCase() === "null" ? null : val))
    .describe("YYYY-MM-DDTHH:mm 형식의 마감일"),
});

export class OpenAiParsingService implements IParsingService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async parse(html: string, config?: JobAdapterConfig): Promise<ParsedJob> {
    const markdown = this.preprocessHtml(html, config);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
          당신은 채용 공고 데이터 추출 전문가입니다. 제공된 텍스트에서 정해진 구조에 따라 정보를 정확히 추출하세요.

          [핵심 규칙]
          1. 텍스트에 명시된 정보만 사용하며, 추측이나 허구의 정보를 생성하지 마세요.
          2. 정보가 없는 경우 JSON null(문자열 "null" 아님) 또는 빈 문자열을 반환하세요.
          3. company_name: 기업의 공식 명칭 또는 법인명을 추출하세요.
          4. career_type: 
             - 'new': 신입/인턴만 해당할 경우
             - 'experienced': 경력직만 해당할 경우
             - 'any': 신입/경력 모두 가능하거나 경력 무관인 경우
          5. deadline: 마감일을 ISO 8601 형식(YYYY-MM-DDTHH:mm)으로 변환하세요. 연도가 없으면 현재 연도(2026년)를 기준으로 합니다.
          6. merit_tags: 복지, 기술 스택, 근무 환경 등 주요 키워드를 최대 10개 추출하세요. 특히 '점심 식대, 저녁 식대, 재택 근무, 유연출근제, 복지포인트, 자유로운 연차 사용, 스톡옵션' 등의 항목은 표현 방식이 다르더라도 의미가 같다면 해당 키워드로 통합하여 추출하세요.
          7. company_memo: 자격 요건, 우대 사항, 기술 스택을 핵심 위주로 간결하게 요약하세요.
          `,
          },
          {
            role: "user",
            content: `다음 채용 공고 텍스트에서 정보를 추출하세요.

--- BEGIN JOB TEXT ---
${markdown}
--- END JOB TEXT ---`,
          },
        ],
        response_format: zodResponseFormat(JobSchema, "job_parsing"),
      });

      const choice = completion.choices[0];

      if (!completion.choices?.length) {
        throw new AppError(
          502,
          "LLM_EMPTY_RESPONSE",
          "No choices returned from LLM",
        );
      }

      if (choice.finish_reason !== "stop") {
        throw new AppError(
          502,
          "LLM_INCOMPLETE",
          `LLM did not finish properly: ${choice.finish_reason}`,
        );
      }

      const result = choice.message.content;

      if (!result) {
        throw new AppError(502, "LLM_EMPTY_CONTENT", "Empty LLM content");
      }

      let parsed;

      try {
        parsed = JSON.parse(result);
      } catch {
        throw new AppError(422, "LLM_INVALID_JSON", "Invalid JSON from LLM");
      }

      const validated = JobSchema.safeParse(parsed);

      if (!validated.success) {
        throw new AppError(
          422,
          "LLM_INVALID_SCHEMA",
          `Invalid schema from LLM: ${validated.error.message}`,
        );
      }

      return validated.data as ParsedJob;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error?.status === 429) {
        throw new AppError(
          429,
          "LLM_RATE_LIMIT",
          "OpenAI API rate limit exceeded",
        );
      }

      if (error?.status >= 500) {
        throw new AppError(
          502,
          "LLM_UPSTREAM_ERROR",
          `OpenAI API error: ${error.message}`,
        );
      }

      throw new AppError(502, "LLM_API_ERROR", error?.message ?? "LLM failed");
    }
  }

  private preprocessHtml(html: string, config?: JobAdapterConfig): string {
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    const extractWithConfig = (
      cfg: JobAdapterConfig,
      label: string,
    ): string | null => {
      const $ = cheerio.load(html);

      $("style, noscript, iframe, script").remove();

      for (const selector of cfg.remove ?? []) {
        if (selector) $(selector).remove();
      }

      let anyMatchedElement = false;

      for (const selector of cfg.content ?? []) {
        if (!selector) continue;

        const nodes = $(selector);
        if (nodes.length > 0) {
          anyMatchedElement = true;
        }

        const extracted = nodes.first().html();
        if (extracted && extracted.trim().length > 0) {
          return extracted;
        }
      }

      if (!anyMatchedElement) {
        for (const selector of cfg.content ?? []) {
          if (!selector) continue;
          console.warn(
            `[OpenAiParsingService] Content selector matched 0 elements: selector="${selector}" label=${label} configVersion=${cfg.version}`,
          );
        }
      }

      return null;
    };

    let extractedHtml: string | null = null;

    if (config) {
      extractedHtml = extractWithConfig(
        config,
        config === ADAPTER_CONFIG.generic ? "generic" : "provided",
      );
    }

    if (!extractedHtml) {
      extractedHtml = extractWithConfig(ADAPTER_CONFIG.generic, "generic");
    }

    if (!extractedHtml) {
      const $ = cheerio.load(html);
      $("style, noscript, iframe, script").remove();

      const text = $.root().text();
      return text.replace(/\s+/g, " ").trim().slice(0, 15000);
    }

    return turndownService.turndown(extractedHtml).trim().slice(0, 15000);
  }
}
