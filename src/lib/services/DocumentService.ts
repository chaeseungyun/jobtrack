import { notFound } from "@/lib/domain/errors";
import type {
  IApplicationRepository,
  IDocumentRepository,
} from "@/lib/domain/repositories";
import type { DocumentRow } from "@/lib/supabase/types";

export class DocumentService {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly applicationRepo: IApplicationRepository,
  ) {}

  async listByApplicationId(
    userId: string,
    applicationId: string,
  ): Promise<DocumentRow[]> {
    const exists = await this.applicationRepo.existsForUser(
      applicationId,
      userId,
    );
    if (!exists) throw notFound("Application not found");

    return this.documentRepo.findByApplicationId(applicationId);
  }

  async upload(
    userId: string,
    applicationId: string,
    file: { name: string; size: number; buffer: Buffer; contentType: string },
    storagePath: string,
  ): Promise<DocumentRow> {
    const exists = await this.applicationRepo.existsForUser(
      applicationId,
      userId,
    );
    if (!exists) throw notFound("Application not found");

    const fileUrl = await this.documentRepo.uploadFile(
      storagePath,
      file.buffer,
      file.contentType,
    );

    return this.documentRepo.create({
      application_id: applicationId,
      file_name: file.name,
      file_size: file.size,
      file_url: fileUrl,
    });
  }

  async remove(userId: string, documentId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) throw notFound("Document not found");

    const exists = await this.applicationRepo.existsForUser(
      document.application_id,
      userId,
    );
    if (!exists) throw notFound("Document not found");

    const storagePath = this.extractStoragePath(document.file_url);

    if (storagePath) {
      await this.documentRepo.removeFile(storagePath);
    }

    await this.documentRepo.remove(documentId);
  }

  private extractStoragePath(fileUrl: string): string | null {
    if (!fileUrl) return null;
    if (!fileUrl.startsWith("http")) return fileUrl;

    try {
      const url = new URL(fileUrl);
      const marker = "/documents/";
      const index = url.pathname.indexOf(marker);

      if (index === -1) return null;

      return decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch {
      return null;
    }
  }
}
