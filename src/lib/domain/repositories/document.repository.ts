import type { DocumentRow } from "@/lib/supabase/types";

export interface CreateDocumentInput {
  application_id: string;
  file_name: string;
  file_size: number;
  file_url: string;
}

export interface IDocumentRepository {
  findByApplicationId(applicationId: string): Promise<DocumentRow[]>;
  findById(id: string): Promise<DocumentRow | null>;
  create(input: CreateDocumentInput): Promise<DocumentRow>;
  remove(id: string): Promise<void>;
  uploadFile(
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string>;
  removeFile(path: string): Promise<void>;
}
