import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { createParsingContainer } from "@/lib/containers/parsing.container";
import { toErrorResponse } from "@/lib/api/response";
import { z } from "zod";
import { inferSourceFromUrl } from "@/lib/parse/source";

const parseHtmlRequestSchema = z.object({
  url: z.string().url(),
  html: z.string().min(1).max(5 * 1024 * 1024),
  bypassCache: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.ok === false) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { url, html, bypassCache } = parseHtmlRequestSchema.parse(body);

    const { jobParsingService } = createParsingContainer();
    const result = await jobParsingService.parseHtml(url, html, { bypassCache });

    const enrichedResult = {
      ...result,
      job_url: url,
      source: result.source ?? inferSourceFromUrl(url),
    };

    return NextResponse.json(enrichedResult);
  } catch (error) {
    return toErrorResponse(error);
  }
}
