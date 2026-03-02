"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { applicationsApi, type ApplicationDetail } from "@/lib/api/client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import { applicationDetailQueryKey } from "@/lib/query/applications";
import type { ParseStatus } from "@/lib/parse/types";
import { mapParsedJobToFormPatch } from "@/lib/parse/mapper";
import { getChangedFields, applySelectedFields } from "@/lib/parse/merge";

import {
  ApplicationFormFields,
  type ApplicationFormValues,
} from "@/app/applications/_components/application-form-fields.client";
import { UrlParseBlock } from "@/app/applications/_components/url-parse-block.client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApplicationDocumentsPanel } from "./application-documents-panel.client";

interface ApplicationDetailFormProps {
  initialApplication: ApplicationDetail;
}

const DETAIL_TOAST_ID = {
  saveSuccess: "application-detail-save-success",
  saveError: "application-detail-save-error",
} as const;

const FIELD_LABELS: Record<keyof ApplicationFormValues, string> = {
  company_name: "기업명",
  position: "직무",
  career_type: "경력 구분",
  job_url: "채용 공고 URL",
  source: "출처",
  merit_tags: "장점 태그",
  current_stage: "단계",
  company_memo: "기업 메모",
  cover_letter: "자기소개서 메모",
  deadline: "마감일",
};

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

  const initialDeadlineEvent =
    initialEvents.find((event) => event.event_type === "deadline") ?? null;
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
    deadline: initialDeadlineEvent
      ? toDatetimeLocalValue(initialDeadlineEvent.scheduled_at)
      : "",
  });

  // --- Reparse state ---
  const [parseStatus, setParseStatus] = useState<ParseStatus>("idle");
  const [parseMessage, setParseMessage] = useState<string | undefined>();
  const [candidatePatch, setCandidatePatch] = useState<Partial<ApplicationFormValues> | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<keyof ApplicationFormValues>>(new Set());

  const handleReparse = async () => {
    setParseStatus("loading");
    setParseMessage(undefined);
    setCandidatePatch(null);
    setSelectedFields(new Set());

    try {
      const parsed = await applicationsApi.parse(form.job_url, { bypassCache: true });
      const fullPatch = mapParsedJobToFormPatch(parsed);
      const changed = getChangedFields(form, fullPatch);

      const hasCompanyAndPosition = !!(parsed.company_name && parsed.position);
      const changedKeys = Object.keys(changed) as Array<keyof ApplicationFormValues>;

      if (changedKeys.length === 0) {
        setParseStatus("success");
        setParseMessage("파싱 결과가 현재 값과 동일합니다.");
        return;
      }

      if (hasCompanyAndPosition) {
        setParseStatus("success");
        setParseMessage("최신 기준으로 재파싱 완료! 반영할 필드를 선택해주세요.");
      } else {
        setParseStatus("partial");
        setParseMessage(
          "일부 필드만 파싱되었습니다. 반영할 필드를 선택해주세요."
        );
      }

      setCandidatePatch(changed);
      setSelectedFields(new Set(changedKeys));
    } catch (error) {
      setParseStatus("fail");
      const message =
        error instanceof Error ? error.message : "파싱에 실패했습니다";
      setParseMessage(message);
    }
  };

  const handleToggleField = (key: keyof ApplicationFormValues) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleApplySelected = () => {
    if (!candidatePatch) return;

    const keysToApply = Array.from(selectedFields);
    const updated = applySelectedFields(form, candidatePatch, keysToApply);

    setForm(updated);
    setCandidatePatch(null);
    setSelectedFields(new Set());
    toast.success(`${keysToApply.length}개 필드가 반영되었습니다.`);
  };

  const handleDismissCandidate = () => {
    setCandidatePatch(null);
    setSelectedFields(new Set());
  };

  // --- Save mutation ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.company_name.trim() || !form.position.trim()) {
        throw new Error("기업명과 직무는 필수입니다");
      }

      const meritTags = form.merit_tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (meritTags.length > 10) {
        throw new Error("장점 태그는 최대 10개까지 가능합니다");
      }

      const deadlineIso = form.deadline
        ? new Date(form.deadline).toISOString()
        : null;

      const updated = await applicationsApi.update(applicationId, {
        company_name: form.company_name.trim(),
        position: form.position.trim(),
        career_type: form.career_type,
        current_stage: form.current_stage,
        source: form.source === "none" ? null : form.source,
        merit_tags: meritTags,
        company_memo: form.company_memo.trim()
          ? form.company_memo.trim()
          : null,
        job_url: form.job_url.trim() ? form.job_url.trim() : null,
        cover_letter: form.cover_letter.trim()
          ? form.cover_letter.trim()
          : null,
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
          ? updated.merit_tags
              .filter((tag): tag is string => typeof tag === "string")
              .join(", ")
          : "",
        company_memo: updated.company_memo ?? "",
        job_url: updated.job_url ?? "",
        cover_letter: updated.cover_letter ?? "",
      }));

      void queryClient.invalidateQueries({
        queryKey: applicationDetailQueryKey(applicationId),
      });

      toast.success("저장 완료", { id: DETAIL_TOAST_ID.saveSuccess });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "수정에 실패했습니다";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      toast.error(message, { id: DETAIL_TOAST_ID.saveError });
    },
  });

  const candidateKeys = candidatePatch
    ? (Object.keys(candidatePatch) as Array<keyof ApplicationFormValues>)
    : [];

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{form.company_name || "지원서"}</CardTitle>
          <Badge>{STAGE_LABELS[form.current_stage]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <UrlParseBlock
          url={form.job_url}
          onUrlChange={(url) =>
            setForm((prev) => ({ ...prev, job_url: url }))
          }
          onParse={handleReparse}
          parseStatus={parseStatus}
          statusMessage={parseMessage}
          parseButtonLabel="재파싱"
          data-testid="reparse-button"
        />

        {candidatePatch && candidateKeys.length > 0 ? (
          <div className="space-y-3 rounded-md border p-4" data-testid="candidate-panel">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">파싱 결과 비교</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDismissCandidate}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedFields.size === 0}
                  onClick={handleApplySelected}
                  data-testid="apply-selected"
                >
                  선택 반영 ({selectedFields.size})
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              {candidateKeys.map((key) => {
                const isSelected = selectedFields.has(key);
                const currentValue = String(form[key] || "");
                const parsedValue = String(candidatePatch[key] ?? "");

                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50"
                    data-field={key}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleField(key)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium">{FIELD_LABELS[key]}</p>
                      <div className="grid gap-1 text-xs overflow-auto">
                        <span className="text-muted-foreground">
                          현재: {currentValue || "(비어 있음)"}
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          파싱: {parsedValue || "(비어 있음)"}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <ApplicationFormFields
          values={form}
          onFieldChange={(patch) => {
            setForm((prev) => ({ ...prev, ...patch }));
          }}
          onSubmit={() => saveMutation.mutate()}
          isSubmitting={saveMutation.isPending}
          submitLabel="변경사항 저장"
          submittingLabel="저장 중..."
          stageOptions={STAGE_ORDER}
          visibleFields={{ job_url: false }}
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
