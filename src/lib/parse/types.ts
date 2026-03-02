import type { CreateApplicationInput } from "@/lib/core/repositories/interfaces/application.repository";
import type { ApplicationFormValues } from "@/app/applications/_components/application-form-fields.client";

export type ParseStatus = "idle" | "loading" | "success" | "partial" | "fail";

export interface ParsedJob extends CreateApplicationInput {
  deadline?: string | null;
}

export interface ParseResultDto {
  status: ParseStatus;
  data?: ParsedJob;
  error?: string;
}

export type ParseFieldPatch = Partial<ApplicationFormValues>;
