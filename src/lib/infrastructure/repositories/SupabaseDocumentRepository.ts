import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IDocumentRepository,
  CreateDocumentInput,
} from "@/lib/domain/repositories";
import type { DocumentRow } from "@/lib/supabase/types";

export class SupabaseDocumentRepository implements IDocumentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByApplicationId(
    applicationId: string,
  ): Promise<DocumentRow[]> {
    const { data, error } = await this.supabase
      .from("documents")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .returns<DocumentRow[]>();

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string): Promise<DocumentRow | null> {
    const { data, error } = await this.supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as DocumentRow | null;
  }

  async create(input: CreateDocumentInput): Promise<DocumentRow> {
    const { data, error } = await this.supabase
      .from("documents")
      .insert(input)
      .select("*")
      .single();

    if (error) throw error;
    return data as DocumentRow;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async uploadFile(
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from("documents")
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = this.supabase.storage
      .from("documents")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async removeFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from("documents")
      .remove([path]);

    if (error) throw error;
  }
}
