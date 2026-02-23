import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/request";
import { createDocumentContainer } from "@/lib/containers/document.container";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id } = await context.params;
  const { documentService } = createDocumentContainer();

  try {
    await documentService.remove(auth.payload.sub, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
