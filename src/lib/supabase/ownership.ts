import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export const assertApplicationOwnership = async (
  supabase: SupabaseClient<Database>,
  applicationId: string,
  userId: string
) => {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
};

export const assertEventOwnership = async (
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId: string
) => {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, application_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (!event) {
    return { owned: false, applicationId: null as string | null };
  }

  const isOwned = await assertApplicationOwnership(
    supabase,
    event.application_id,
    userId
  );

  return {
    owned: isOwned,
    applicationId: event.application_id,
  };
};

export const assertDocumentOwnership = async (
  supabase: SupabaseClient<Database>,
  documentId: string,
  userId: string
) => {
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, application_id, file_url")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) {
    throw new Error(documentError.message);
  }

  if (!document) {
    return {
      owned: false,
      applicationId: null as string | null,
      fileUrl: null as string | null,
    };
  }

  const isOwned = await assertApplicationOwnership(
    supabase,
    document.application_id,
    userId
  );

  return {
    owned: isOwned,
    applicationId: document.application_id,
    fileUrl: document.file_url,
  };
};
