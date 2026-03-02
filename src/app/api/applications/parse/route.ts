import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { createParsingContainer } from "@/lib/containers/parsing.container";
import { toErrorResponse } from "@/lib/api/response";
import { z } from "zod";
import { inferSourceFromUrl } from "@/lib/parse/source";

const parseRequestSchema = z.object({
  url: z.string().url(),
  bypassCache: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.ok === false) {
    return auth.response;
  }

  // const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  // if (!token) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const body = await request.json();
    const { url, bypassCache } = parseRequestSchema.parse(body);

    const { jobParsingService } = createParsingContainer();
    const result = await jobParsingService.parseUrl(url, { bypassCache });

    // Enrich result with URL and Source
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
