import { NextRequest, NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/request";
import { createDocumentContainer } from "@/lib/containers/document.container";

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

  const { documentService } = createDocumentContainer();

  try {
    const document = await documentService.upload(
      auth.payload.sub,
      id,
      {
        name: safeName,
        size: fileValue.size,
        buffer: fileBuffer,
        contentType: PDF_MIME_TYPE,
      },
      storagePath,
    );

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
