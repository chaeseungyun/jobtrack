import type { ApplicationFormValues } from "@/app/applications/_components/application-form-fields.client";

/**
 * Returns only the fields where parsed values differ from current form values.
 * Used in the edit form to build the candidate comparison panel.
 */
export function getChangedFields(
  current: ApplicationFormValues,
  parsed: Partial<ApplicationFormValues>
): Partial<ApplicationFormValues> {
  const result: Partial<ApplicationFormValues> = {};

  for (const key of Object.keys(parsed) as Array<keyof ApplicationFormValues>) {
    if (key === "job_url") continue; // job_url is the input, not a candidate for change
    const parsedValue = parsed[key];
    if (parsedValue !== undefined && current[key] !== parsedValue) {
      Object.assign(result, { [key]: parsedValue });
    }
  }

  return result;
}

/**
 * Applies only selected fields from candidate to current form values.
 * Unselected fields remain unchanged — no implicit overwrites.
 */
export function applySelectedFields(
  current: ApplicationFormValues,
  candidate: Partial<ApplicationFormValues>,
  selectedKeys: Array<keyof ApplicationFormValues>
): ApplicationFormValues {
  const result = { ...current };

  for (const key of selectedKeys) {
    if (key in candidate) {
      Object.assign(result, { [key]: candidate[key] });
    }
  }

  return result;
}

/**
 * Returns a diff object showing current vs parsed values for changed fields.
 * Each key maps to { current, parsed } for display in the candidate panel.
 */
export function getDiff(
  current: Record<string, unknown>,
  parsed: Record<string, unknown>
): Record<string, { current: unknown; parsed: unknown }> {
  const result: Record<string, { current: unknown; parsed: unknown }> = {};

  for (const key of Object.keys(parsed)) {
    if (current[key] !== parsed[key]) {
      result[key] = { current: current[key], parsed: parsed[key] };
    }
  }

  return result;
}
