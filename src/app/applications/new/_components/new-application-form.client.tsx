"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { applicationsApi, documentsApi } from "@/lib/api/client";

import {
  ApplicationFormFields,
  type ApplicationFormValues,
} from "@/app/applications/_components/application-form-fields.client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_FORM: ApplicationFormValues = {
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CREATE_TOAST_ID = {
  success: "application-create-success",
  error: "application-create-error",
  uploadError: "application-create-upload-error",
} as const;

const getFileValidationError = (file: File) => {
  if (file.type !== "application/pdf") {
    return "PDF 파일만 업로드할 수 있습니다";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "파일 크기는 10MB 이하여야 합니다";
  }

  return null;
};

export function NewApplicationForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ApplicationFormValues>(INITIAL_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createMutation = useMutation({
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
        : undefined;

      const created = await applicationsApi.create({
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

      let uploadError: string | null = null;

      if (selectedFile) {
        const fileError = getFileValidationError(selectedFile);
        if (fileError) {
          uploadError = fileError;
        } else {
          try {
            await documentsApi.upload(created.id, selectedFile);
          } catch (error) {
            uploadError = error instanceof Error ? error.message : "업로드 실패";
          }
        }
      }

      return { created, uploadError };
    },
    onSuccess: ({ created, uploadError }) => {
      toast.success("지원서가 등록되었습니다", { id: CREATE_TOAST_ID.success });

      if (uploadError) {
        toast.error(uploadError, { id: CREATE_TOAST_ID.uploadError });
      }

      router.replace(`/applications/${created.id}`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "등록에 실패했습니다";

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
        <CardTitle>새 지원서</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ApplicationFormFields
          values={form}
          onFieldChange={(patch) => {
            setForm((prev) => ({ ...prev, ...patch }));
          }}
          onSubmit={() => createMutation.mutate()}
          isSubmitting={createMutation.isPending}
          submitLabel="지원서 등록"
          submittingLabel="등록 중..."
          beforeSubmit={
            <div className="space-y-2">
              <Label htmlFor="document_file">문서 PDF (선택사항)</Label>
              <Input
                id="document_file"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                }}
              />
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
