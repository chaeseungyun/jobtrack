import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAiParsingService } from "../llm/OpenAiParsingService";
import { ADAPTER_CONFIG } from "@/lib/core/config/adapter.config";
import TurndownService from "turndown";

// Mock TurndownService to verify if it was called correctly if needed, 
// but here we use the real one to verify extraction quality.
// Mock OpenAI
vi.mock("openai", () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ company_name: "Mocked", position: "Dev", career_type: "any" }) } }],
        }),
      },
    };
  }
  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

describe("OpenAiParsingService Integration (Preprocessing)", () => {
  let service: OpenAiParsingService;
  const mockApiKey = "sk-mock-key";

  beforeEach(() => {
    service = new OpenAiParsingService(mockApiKey);
  });

  it("should isolate Saramin content and remove noise", async () => {
    const html = `
      <html>
        <body>
          <div class="header">Header</div>
          <div class="wrap_jv_cont">
            <h1>Frontend Developer</h1>
            <p>We are hiring.</p>
            <script>console.log('noise')</script>
            <style>.noise { color: red; }</style>
            <div class="wrap_recommend_slide">Recommendations</div>
          </div>
          <div class="footer">Footer</div>
        </body>
      </html>
    `;

    // Access private method for testing preprocessing
    const markdown = (service as any).preprocessHtml(html, ADAPTER_CONFIG["saramin.co.kr"]);

    expect(markdown).toContain("# Frontend Developer");
    expect(markdown).toContain("We are hiring.");
    expect(markdown).not.toContain("Header");
    expect(markdown).not.toContain("Footer");
    expect(markdown).not.toContain("console.log");
    expect(markdown).not.toContain("Recommendations");
  });

  it("should isolate JobKorea content", async () => {
    const html = `
      <html>
        <body>
          <div class="jobKindCont">
            <h2>Backend Developer</h2>
            <ul>
              <li>Node.js</li>
              <li>PostgreSQL</li>
            </ul>
          </div>
          <div class="other">Other stuff</div>
        </body>
      </html>
    `;

    const markdown = (service as any).preprocessHtml(html, ADAPTER_CONFIG["jobkorea.co.kr"]);

    expect(markdown).toContain("## Backend Developer");
    expect(markdown).toContain("Node.js");
    expect(markdown).not.toContain("Other stuff");
  });

  it("should fallback to generic when specific selector fails", async () => {
    // URL was saramin but HTML changed (no .wrap_jv_cont)
    const html = `
      <html>
        <body>
          <main>
            <h1>Changed Saramin Structure</h1>
            <p>But still has main tag.</p>
          </main>
        </body>
      </html>
    `;

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const markdown = (service as any).preprocessHtml(html, ADAPTER_CONFIG["saramin.co.kr"]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Content selector matched 0 elements"));
    expect(markdown).toContain("# Changed Saramin Structure");
    expect(markdown).toContain("But still has main tag.");
    
    consoleSpy.mockRestore();
  });

  it("should fallback to raw text when even generic fails", async () => {
    const html = `
      <div>
        No standard tags here.
        Just some text.
      </div>
    `;

    const markdown = (service as any).preprocessHtml(html, ADAPTER_CONFIG.generic);
    
    // Generic fallback for ADAPTER_CONFIG.generic is raw text
    expect(markdown).toBe("No standard tags here. Just some text.");
  });

  it("should truncate long content to 15,000 characters", async () => {
    const longText = "Long text ".repeat(2000);
    const html = `<html><body><main>${longText}</main></body></html>`;

    const markdown = (service as any).preprocessHtml(html, ADAPTER_CONFIG.generic);

    expect(markdown.length).toBeLessThanOrEqual(15000);
    expect(markdown.length).toBeGreaterThan(14000);
  });
});
