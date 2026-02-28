import { SupabaseApplicationRepository } from "@/lib/core/repositories/supabase";
import { SupabaseDocumentRepository } from "@/lib/core/repositories/supabase";
import { DocumentService } from "@/lib/core/services/DocumentService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createDocumentContainer() {
  const supabase = createServerSupabaseClient();
  const applicationRepo = new SupabaseApplicationRepository(supabase);
  const documentRepo = new SupabaseDocumentRepository(supabase);

  return {
    documentService: new DocumentService(documentRepo, applicationRepo),
  };
}
