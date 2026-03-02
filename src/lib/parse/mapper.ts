import type { ApplicationFormValues } from "@/app/applications/_components/application-form-fields.client";
import type { ParsedJob } from "./types";

/**
 * Maps a ParsedJob (server response) to a Partial<ApplicationFormValues> (form patch).
 * This is a pure function used to update the form state after parsing a job URL.
 */
export function mapParsedJobToFormPatch(
  parsed: ParsedJob
): Partial<ApplicationFormValues> {
  const patch: Partial<ApplicationFormValues> = {};

  patch.company_name = parsed.company_name ?? "";
  patch.position = parsed.position ?? "";
  if (parsed.career_type) {
    patch.career_type = parsed.career_type;
  }


  // Optional fields with default values
  patch.job_url = parsed.job_url ?? "";
  patch.source = parsed.source ?? "none";
  patch.merit_tags = (parsed.merit_tags ?? []).join(", ");
  patch.company_memo = parsed.company_memo ?? "";
  patch.cover_letter = parsed.cover_letter ?? "";

  // current_stage: only include if present
  if (parsed.current_stage !== undefined && parsed.current_stage !== null) {
    patch.current_stage = parsed.current_stage;
  }

  // deadline: null/undefined -> "", ISO -> YYYY-MM-DDTHH:mm
  if (parsed.deadline) {
    try {
      const date = new Date(parsed.deadline);
      if (!isNaN(date.getTime())) {
        // Use ISO string and slice to get YYYY-MM-DDTHH:mm
        patch.deadline = date.toISOString().slice(0, 16);
      } else {
        patch.deadline = "";
      }
    } catch {
      patch.deadline = "";
    }
  } else {
    patch.deadline = "";
  }

  return patch;
}

