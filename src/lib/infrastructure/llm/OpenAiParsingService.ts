import { IParsingService, ParsedJob } from "@/lib/domain/services/parser.service";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const JobSchema = z.object({
  company_name: z.string().describe("기업 공식 명칭"),
  position: z.string().describe("채용 포지션명"),
  career_type: z.enum(["new", "experienced", "any"]).describe("신입, 경력, 무관 중 하나"),
  merit_tags: z.array(z.string()).max(10).describe("복지, 기술스택, 근무환경 등 주요 키워드"),
  company_memo: z.string().describe("요구 기술 스택, 자격 요건, 우대 사항 요약"),
  deadline: z.string().nullable().describe("YYYY-MM-DDTHH:mm 형식의 마감일"),
});

export class OpenAiParsingService implements IParsingService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async parse(html: string): Promise<ParsedJob> {
    const markdown = this.preprocessHtml(html);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 채용 공고 텍스트에서 구조화된 정보를 추출하는 전문가입니다. 주어진 텍스트에서 정보를 추출하여 JSON 형식으로 반환하세요.",
        },
        {
          role: "user",
          content: markdown,
        },
      ],
      response_format: zodResponseFormat(JobSchema, "job_parsing"),
    });


    const result = completion.choices[0].message.content;
    if (!result) {
      throw new Error("Failed to parse job data from LLM response");
    }

    return JSON.parse(result) as ParsedJob;
  }


  private preprocessHtml(html: string): string {
    const dom = new JSDOM(html);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim().slice(0, 10000);
    }

    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    return turndownService.turndown(article.content).slice(0, 10000);
  }
}
