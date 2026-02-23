import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/request";
import { createApplicationContainer } from "@/lib/containers/application.container";
import { createDocumentContainer } from "@/lib/containers/document.container";
import { updateApplicationSchema } from "@/lib/validation/step4";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id } = await context.params;
  const { applicationService } = createApplicationContainer();
  const { documentService } = createDocumentContainer();

  try {
    const [detail, documents] = await Promise.all([
      applicationService.getDetail(id, auth.payload.sub),
      documentService.listByApplicationId(auth.payload.sub, id),
    ]);

    return NextResponse.json({ ...detail, documents });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const body = await request
    .json()
    .catch(() => null as Record<string, unknown> | null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { id } = await context.params;
  const { applicationService } = createApplicationContainer();

  try {
    const { deadline, ...rest } = parsed.data;

    const updated = await applicationService.update(id, auth.payload.sub, {
      ...rest,
      deadline,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id } = await context.params;
  const { applicationService } = createApplicationContainer();

  try {
    await applicationService.remove(id, auth.payload.sub);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
