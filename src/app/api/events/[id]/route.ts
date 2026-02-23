import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/request";
import { createApplicationContainer } from "@/lib/containers/application.container";
import { createEventSchema, updateEventSchema } from "@/lib/validation/step4";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id: applicationId } = await context.params;
  const body = await request
    .json()
    .catch(() => null as Record<string, unknown> | null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { eventService } = createApplicationContainer();

  try {
    const data = await eventService.create(
      auth.payload.sub,
      applicationId,
      parsed.data,
    );

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id: eventId } = await context.params;
  const body = await request
    .json()
    .catch(() => null as Record<string, unknown> | null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { eventService } = createApplicationContainer();

  try {
    const updated = await eventService.update(
      auth.payload.sub,
      eventId,
      parsed.data,
    );

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

  const { id: eventId } = await context.params;
  const { eventService } = createApplicationContainer();

  try {
    await eventService.remove(auth.payload.sub, eventId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
