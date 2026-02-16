"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { applicationsApi } from "@/lib/api/client";
import {
  CAREER_TYPES,
  SOURCE_TYPES,
  STAGE_TYPES,
  type CareerType,
  type SourceType,
  type StageType,
} from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface FormState {
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

const STAGE_LABELS: Record<StageType, string> = {
  interest: "Interest",
  applied: "Applied",
  document_pass: "Document Pass",
  assignment: "Assignment",
  interview: "Interview",
  final_pass: "Final Pass",
  rejected: "Rejected",
};

const INITIAL_FORM: FormState = {
  company_name: "",
  position: "",
  career_type: "new",
  job_url: "",
  source: "none",
  merit_tags: "",
  current_stage: "interest",
  company_memo: "",
  cover_letter: "",
  deadline: "",
};

const CREATE_TOAST_ID = {
  success: "application-create-success",
  error: "application-create-error",
} as const;

export function NewApplicationForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.company_name.trim() || !form.position.trim()) {
        throw new Error("Company and position are required");
      }

      const meritTags = form.merit_tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (meritTags.length > 10) {
        throw new Error("Merit tags can include up to 10 items");
      }

      const deadlineIso = form.deadline
        ? new Date(form.deadline).toISOString()
        : undefined;

      return applicationsApi.create({
        company_name: form.company_name.trim(),
        position: form.position.trim(),
        career_type: form.career_type,
        job_url: form.job_url.trim() ? form.job_url.trim() : null,
        source: form.source === "none" ? null : form.source,
        merit_tags: meritTags.length > 0 ? meritTags : undefined,
        current_stage: form.current_stage,
        company_memo: form.company_memo.trim() ? form.company_memo.trim() : null,
        cover_letter: form.cover_letter.trim() ? form.cover_letter.trim() : null,
        deadline: deadlineIso,
      });
    },
    onSuccess: (created) => {
      toast.success("Application created", { id: CREATE_TOAST_ID.success });
      router.replace(`/applications/${created.id}`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to create";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      toast.error(message, { id: CREATE_TOAST_ID.error });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Application</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, company_name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={form.position}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, position: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="career_type">Career Type</Label>
            <Select
              value={form.career_type}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, career_type: value as CareerType }))
              }
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

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={form.source}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, source: value as SourceType | "none" }))
              }
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

          <div className="space-y-2">
            <Label htmlFor="current_stage">Stage</Label>
            <Select
              value={form.current_stage}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, current_stage: value as StageType }))
              }
            >
              <SelectTrigger id="current_stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_TYPES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job_url">Job URL</Label>
            <Input
              id="job_url"
              value={form.job_url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, job_url: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={form.deadline}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, deadline: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="merit_tags">Merit Tags (comma separated)</Label>
          <Input
            id="merit_tags"
            value={form.merit_tags}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, merit_tags: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_memo">Company Memo</Label>
          <Textarea
            id="company_memo"
            value={form.company_memo}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, company_memo: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover_letter">Cover Letter Memo</Label>
          <Textarea
            id="cover_letter"
            value={form.cover_letter}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, cover_letter: event.target.value }))
            }
          />
        </div>

        <Button
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Creating..." : "Create Application"}
        </Button>
      </CardContent>
    </Card>
  );
}
