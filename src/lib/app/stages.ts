import type { StageType } from "@/lib/supabase/types";

export const STAGE_LABELS: Record<StageType, string> = {
  interest: "관심",
  applied: "지원완료",
  document_pass: "서류합격",
  assignment: "과제",
  interview: "면접",
  final_pass: "최종합격",
  rejected: "불합격",
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
