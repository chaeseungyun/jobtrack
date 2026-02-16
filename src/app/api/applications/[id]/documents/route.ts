import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/request";
import { documentService } from "@/lib/services/document.service";
import { assertApplicationOwnership } from "@/lib/supabase/ownership";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

const sanitizeFileName = (fileName: string) => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request);

  if (auth.ok === false) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createServerSupabaseClient();

  try {
    const isOwned = await assertApplicationOwnership(supabase, id, auth.payload.sub);

    if (!isOwned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (fileValue.type !== PDF_MIME_TYPE) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 10MB or less" }, { status: 400 });
    }

    const safeName = sanitizeFileName(fileValue.name || "document.pdf");
    const storagePath = `${auth.payload.sub}/${id}/${Date.now()}-${safeName}`;
    const fileBuffer = Buffer.from(await fileValue.arrayBuffer());

    const fileUrl = await documentService.uploadStorage(
      supabase,
      storagePath,
      fileBuffer,
      PDF_MIME_TYPE
    );

    const document = await documentService.create(supabase, {
      application_id: id,
      file_name: safeName,
      file_size: fileValue.size,
      file_url: fileUrl,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
