import { SupabaseApplicationRepository } from "@/lib/infrastructure/repositories";
import { SupabaseDocumentRepository } from "@/lib/infrastructure/repositories";
import { DocumentService } from "@/lib/services/DocumentService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export function createDocumentContainer() {
  const supabase = createServerSupabaseClient();
  const applicationRepo = new SupabaseApplicationRepository(supabase);
  const documentRepo = new SupabaseDocumentRepository(supabase);

  return {
    documentService: new DocumentService(documentRepo, applicationRepo),
  };
}
