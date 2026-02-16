"use client";

import type { ReactNode } from "react";

import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import {
  CAREER_TYPES,
  SOURCE_TYPES,
  type CareerType,
  type SourceType,
  type StageType,
} from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ApplicationFormValues {
  company_name: string;
  position: string;
  career_type: CareerType;
  job_url: string;
  source: SourceType | "none";
  merit_tags: string;
  current_stage: StageType;
  company_memo: string;
  cover_letter: string;
  deadline: string;
}

interface VisibleFields {
  company_name?: boolean;
  position?: boolean;
  career_type?: boolean;
  source?: boolean;
  current_stage?: boolean;
  job_url?: boolean;
  deadline?: boolean;
  merit_tags?: boolean;
  company_memo?: boolean;
  cover_letter?: boolean;
}

interface ApplicationFormFieldsProps {
  values: ApplicationFormValues;
  onFieldChange: (patch: Partial<ApplicationFormValues>) => void;
  onSubmit: () => void;
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  visibleFields?: VisibleFields;
  stageOptions?: StageType[];
  beforeSubmit?: ReactNode;
}

const CAREER_LABELS: Record<CareerType, string> = {
  new: "New",
  experienced: "Experienced",
  any: "Any",
};

const SOURCE_LABELS: Record<SourceType, string> = {
  saramin: "Saramin",
  jobkorea: "JobKorea",
  company: "Company Site",
  linkedin: "LinkedIn",
  etc: "Etc",
};

const isVisible = (visibleFields: VisibleFields | undefined, key: keyof ApplicationFormValues) => {
  if (!visibleFields) {
    return true;
  }

  return visibleFields[key] !== false;
};

export function ApplicationFormFields({
  values,
  onFieldChange,
  onSubmit,
  submitLabel,
  submittingLabel,
  isSubmitting,
  visibleFields,
  stageOptions = STAGE_ORDER,
  beforeSubmit,
}: ApplicationFormFieldsProps) {
  return (
    <>
      {isVisible(visibleFields, "company_name") || isVisible(visibleFields, "position") ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {isVisible(visibleFields, "company_name") ? (
            <div className="space-y-2">
              <Label htmlFor="company_name">Company</Label>
              <Input
                id="company_name"
                value={values.company_name}
                onChange={(event) => onFieldChange({ company_name: event.target.value })}
              />
            </div>
          ) : null}

          {isVisible(visibleFields, "position") ? (
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={values.position}
                onChange={(event) => onFieldChange({ position: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {isVisible(visibleFields, "career_type") ||
      isVisible(visibleFields, "source") ||
      isVisible(visibleFields, "current_stage") ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {isVisible(visibleFields, "career_type") ? (
            <div className="space-y-2">
              <Label htmlFor="career_type">Career Type</Label>
              <Select
                value={values.career_type}
                onValueChange={(value) => onFieldChange({ career_type: value as CareerType })}
              >
                <SelectTrigger id="career_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAREER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CAREER_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isVisible(visibleFields, "source") ? (
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={values.source}
                onValueChange={(value) => onFieldChange({ source: value as SourceType | "none" })}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SOURCE_TYPES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isVisible(visibleFields, "current_stage") ? (
            <div className="space-y-2">
              <Label htmlFor="current_stage">Stage</Label>
              <Select
                value={values.current_stage}
                onValueChange={(value) => onFieldChange({ current_stage: value as StageType })}
              >
                <SelectTrigger id="current_stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {isVisible(visibleFields, "job_url") || isVisible(visibleFields, "deadline") ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {isVisible(visibleFields, "job_url") ? (
            <div className="space-y-2">
              <Label htmlFor="job_url">Job URL</Label>
              <Input
                id="job_url"
                value={values.job_url}
                onChange={(event) => onFieldChange({ job_url: event.target.value })}
              />
            </div>
          ) : null}

          {isVisible(visibleFields, "deadline") ? (
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={values.deadline}
                onChange={(event) => onFieldChange({ deadline: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {isVisible(visibleFields, "merit_tags") ? (
        <div className="space-y-2">
          <Label htmlFor="merit_tags">Merit Tags (comma separated)</Label>
          <Input
            id="merit_tags"
            value={values.merit_tags}
            onChange={(event) => onFieldChange({ merit_tags: event.target.value })}
          />
        </div>
      ) : null}

      {isVisible(visibleFields, "company_memo") ? (
        <div className="space-y-2">
          <Label htmlFor="company_memo">Company Memo</Label>
          <Textarea
            id="company_memo"
            value={values.company_memo}
            onChange={(event) => onFieldChange({ company_memo: event.target.value })}
          />
        </div>
      ) : null}

      {isVisible(visibleFields, "cover_letter") ? (
        <div className="space-y-2">
          <Label htmlFor="cover_letter">Cover Letter Memo</Label>
          <Textarea
            id="cover_letter"
            value={values.cover_letter}
            onChange={(event) => onFieldChange({ cover_letter: event.target.value })}
          />
        </div>
      ) : null}

      {beforeSubmit}

      <Button disabled={isSubmitting} onClick={onSubmit}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </>
  );
}
