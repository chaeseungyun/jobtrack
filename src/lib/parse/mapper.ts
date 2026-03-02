import type { ApplicationFormValues } from "@/app/applications/_components/application-form-fields.client";
import type { ParsedJob } from "./types";

/**
 * Sanitizes a string value from the parser.
 * LLMs sometimes return "null" or "NULL" as a string instead of a real null.
 */
function sanitize(val: string | null | undefined): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (trimmed.toLowerCase() === "null") return "";
  return trimmed;
}

/**
 * Maps a ParsedJob (server response) to a Partial<ApplicationFormValues> (form patch).

 * Maps a ParsedJob (server response) to a Partial<ApplicationFormValues> (form patch).
 * This is a pure function used to update the form state after parsing a job URL.
 */
export function mapParsedJobToFormPatch(
  parsed: ParsedJob,
): Partial<ApplicationFormValues> {
  const patch: Partial<ApplicationFormValues> = {};

  patch.company_name = sanitize(parsed.company_name);
  patch.position = sanitize(parsed.position);
  if (parsed.career_type) {
    patch.career_type = parsed.career_type;
  }

  // Optional fields with default values
  patch.job_url = sanitize(parsed.job_url);
  patch.source = parsed.source ?? "none";
  patch.merit_tags = (parsed.merit_tags ?? []).join(", ");
  patch.company_memo = sanitize(parsed.company_memo);
  patch.cover_letter = sanitize(parsed.cover_letter);

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
