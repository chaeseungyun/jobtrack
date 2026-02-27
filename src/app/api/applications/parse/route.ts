import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { createParsingContainer } from "@/lib/containers/parsing.container";
import { toErrorResponse } from "@/lib/api/response";
import { z } from "zod";

const parseRequestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.ok === false) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { url } = parseRequestSchema.parse(body);

    const { jobParsingService } = createParsingContainer();
    const result = await jobParsingService.parseUrl(url);

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
