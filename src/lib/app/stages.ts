import type { StageType } from "@/lib/supabase/types";

export const STAGE_LABELS: Record<StageType, string> = {
  interest: "Interest",
  applied: "Applied",
  document_pass: "Document Pass",
  assignment: "Assignment",
  interview: "Interview",
  final_pass: "Final Pass",
  rejected: "Rejected",
};

export const STAGE_ORDER: StageType[] = [
  "interest",
  "applied",
  "document_pass",
  "assignment",
  "interview",
  "final_pass",
  "rejected",
];
