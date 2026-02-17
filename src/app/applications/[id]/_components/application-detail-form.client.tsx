"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { applicationsApi, type ApplicationDetail } from "@/lib/api/client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import { applicationDetailQueryKey } from "@/lib/query/applications";
import type { ApplicationRow, DocumentRow, EventRow } from "@/lib/supabase/types";

import {
  ApplicationFormFields,
  type ApplicationFormValues,
} from "@/app/applications/_components/application-form-fields.client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationDocumentsPanel } from "./application-documents-panel.client";

interface ApplicationDetailFormProps {
  initialApplication: ApplicationDetail;
}

const DETAIL_TOAST_ID = {
  saveSuccess: "application-detail-save-success",
  saveError: "application-detail-save-error",
} as const;

const toDatetimeLocalValue = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function ApplicationDetailForm({
  initialApplication,
}: ApplicationDetailFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicationId = initialApplication.id;
  
  const initialEvents = initialApplication.events;
  const initialDocuments = initialApplication.documents;
  
  const initialDeadlineEvent = initialEvents.find((event) => event.event_type === "deadline") ?? null;
  const initialMeritTags = Array.isArray(initialApplication.merit_tags)
    ? initialApplication.merit_tags
        .filter((tag): tag is string => typeof tag === "string")
        .join(", ")
    : "";

  const [form, setForm] = useState<ApplicationFormValues>({
    company_name: initialApplication.company_name,
    position: initialApplication.position,
    career_type: initialApplication.career_type,
    current_stage: initialApplication.current_stage,
    source: initialApplication.source ?? "none",
    merit_tags: initialMeritTags,
    company_memo: initialApplication.company_memo ?? "",
    job_url: initialApplication.job_url ?? "",
    cover_letter: initialApplication.cover_letter ?? "",
    deadline: initialDeadlineEvent ? toDatetimeLocalValue(initialDeadlineEvent.scheduled_at) : "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
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

      const deadlineIso = form.deadline ? new Date(form.deadline).toISOString() : null;

      const updated = await applicationsApi.update(applicationId, {
        company_name: form.company_name.trim(),
        position: form.position.trim(),
        career_type: form.career_type,
        current_stage: form.current_stage,
        source: form.source === "none" ? null : form.source,
        merit_tags: meritTags,
        company_memo: form.company_memo.trim() ? form.company_memo.trim() : null,
        job_url: form.job_url.trim() ? form.job_url.trim() : null,
        cover_letter: form.cover_letter.trim() ? form.cover_letter.trim() : null,
        deadline: deadlineIso,
      });

      return updated;
    },
    onSuccess: (updated) => {
      setForm((prev) => ({
        ...prev,
        company_name: updated.company_name,
        position: updated.position,
        career_type: updated.career_type,
        current_stage: updated.current_stage,
        source: updated.source ?? "none",
        merit_tags: Array.isArray(updated.merit_tags)
          ? updated.merit_tags.filter((tag): tag is string => typeof tag === "string").join(", ")
          : "",
        company_memo: updated.company_memo ?? "",
        job_url: updated.job_url ?? "",
        cover_letter: updated.cover_letter ?? "",
      }));

      void queryClient.invalidateQueries({
        queryKey: applicationDetailQueryKey(applicationId),
      });

      toast.success("Saved", { id: DETAIL_TOAST_ID.saveSuccess });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Update failed";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      toast.error(message, { id: DETAIL_TOAST_ID.saveError });
    },
  });

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{form.company_name || "Application"}</CardTitle>
          <Badge>{STAGE_LABELS[form.current_stage]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ApplicationFormFields
          values={form}
          onFieldChange={(patch) => {
            setForm((prev) => ({ ...prev, ...patch }));
          }}
          onSubmit={() => saveMutation.mutate()}
          isSubmitting={saveMutation.isPending}
          submitLabel="Save changes"
          submittingLabel="Saving..."
          stageOptions={STAGE_ORDER}
          beforeSubmit={
            <ApplicationDocumentsPanel
              applicationId={applicationId}
              initialDocuments={initialDocuments}
            />
          }
        />
      </CardContent>
    </Card>
  );
}
