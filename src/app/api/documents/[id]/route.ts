import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { documentService } from "@/lib/services/document.service";
import { assertDocumentOwnership } from "@/lib/supabase/ownership";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const extractStoragePath = (fileUrl: string): string | null => {
  if (!fileUrl) {
    return null;
  }

  if (!fileUrl.startsWith("http")) {
    return fileUrl;
  }

  try {
    const url = new URL(fileUrl);
    const marker = "/documents/";
    const index = url.pathname.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createServerSupabaseClient();

  try {
    const ownership = await assertDocumentOwnership(supabase, id, auth.payload.sub);

    if (!ownership.owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const storagePath = extractStoragePath(ownership.fileUrl ?? "");

    if (storagePath) {
      await documentService.removeStorage(supabase, storagePath);
    }

    await documentService.remove(supabase, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
