import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentRow } from "@/lib/supabase/types";

export interface CreateDocumentInput {
  application_id: string;
  file_name: string;
  file_size: number;
  file_url: string;
}

export const documentService = {
  async listByApplicationId(supabase: SupabaseClient, applicationId: string) {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .returns<DocumentRow[]>();

    if (error) throw error;
    return data ?? [];
  },

  async getById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .returns<DocumentRow | null>();

    if (error) throw error;
    return data;
  },

  async create(supabase: SupabaseClient, input: CreateDocumentInput) {
    const { data, error } = await supabase
      .from("documents")
      .insert(input)
      .select("*")
      .single();

    if (error) throw error;
    return data as DocumentRow;
  },

  async remove(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadStorage(
    supabase: SupabaseClient,
    path: string,
    file: Buffer,
    contentType: string
  ) {
    const { error } = await supabase.storage
      .from("documents")
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return data.publicUrl;
  },

  async removeStorage(supabase: SupabaseClient, path: string) {
    const { error } = await supabase.storage
      .from("documents")
      .remove([path]);

    if (error) throw error;
  },
};
