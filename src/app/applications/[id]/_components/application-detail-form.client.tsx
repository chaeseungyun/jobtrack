"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { applicationsApi, documentsApi } from "@/lib/api/client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import type { ApplicationRow, DocumentRow, StageType } from "@/lib/supabase/types";

import { Badge } from "@/components/ui/badge";
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

interface EditState {
  position: string;
  current_stage: StageType;
  company_memo: string;
  job_url: string;
  cover_letter: string;
}

interface ApplicationDetailFormProps {
  initialApplication: ApplicationRow;
  initialDocuments: DocumentRow[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DETAIL_TOAST_ID = {
  saveSuccess: "application-detail-save-success",
  saveError: "application-detail-save-error",
  uploadSuccess: "application-detail-upload-success",
  uploadError: "application-detail-upload-error",
  deleteSuccess: "application-detail-delete-success",
  deleteError: "application-detail-delete-error",
} as const;

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
};

export function ApplicationDetailForm({
  initialApplication,
  initialDocuments,
}: ApplicationDetailFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [application, setApplication] = useState(initialApplication);
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [editState, setEditState] = useState<EditState>({
    position: initialApplication.position,
    current_stage: initialApplication.current_stage,
    company_memo: initialApplication.company_memo ?? "",
    job_url: initialApplication.job_url ?? "",
    cover_letter: initialApplication.cover_letter ?? "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      applicationsApi.update(application.id, {
        position: editState.position,
        current_stage: editState.current_stage,
        company_memo: editState.company_memo || null,
        job_url: editState.job_url || null,
        cover_letter: editState.cover_letter || null,
      }),
    onSuccess: (updated) => {
      setApplication((prev) => ({ ...prev, ...updated }));
      setEditState((prev) => ({
        ...prev,
        current_stage: updated.current_stage,
      }));
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

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) {
        throw new Error("File is required");
      }

      if (selectedFile.type !== "application/pdf") {
        throw new Error("Only PDF files are allowed");
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        throw new Error("File size must be 10MB or less");
      }

      return documentsApi.upload(application.id, selectedFile);
    },
    onSuccess: (uploaded) => {
      setDocuments((prev) => [uploaded, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Uploaded", { id: DETAIL_TOAST_ID.uploadSuccess });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Upload failed";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      toast.error(message, { id: DETAIL_TOAST_ID.uploadError });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => documentsApi.remove(documentId),
    onMutate: (documentId) => {
      setDeletingDocumentId(documentId);
    },
    onSuccess: (_, documentId) => {
      setDocuments((prev) => prev.filter((document) => document.id !== documentId));
      toast.success("Deleted", { id: DETAIL_TOAST_ID.deleteSuccess });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Delete failed";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      toast.error(message, { id: DETAIL_TOAST_ID.deleteError });
    },
    onSettled: () => {
      setDeletingDocumentId(null);
    },
  });

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{application.company_name}</CardTitle>
          <Badge>{STAGE_LABELS[application.current_stage]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={editState.position}
            onChange={(event) =>
              setEditState((prev) => ({ ...prev, position: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stage">Stage</Label>
          <Select
            value={editState.current_stage}
            onValueChange={(value) =>
              setEditState((prev) => ({
                ...prev,
                current_stage: value as StageType,
              }))
            }
          >
            <SelectTrigger id="stage" className="w-full">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGE_ORDER.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="job_url">Job URL</Label>
          <Input
            id="job_url"
            value={editState.job_url}
            onChange={(event) =>
              setEditState((prev) => ({ ...prev, job_url: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_memo">Company memo</Label>
          <Textarea
            id="company_memo"
            value={editState.company_memo}
            onChange={(event) =>
              setEditState((prev) => ({ ...prev, company_memo: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover_letter">Cover letter memo</Label>
          <Textarea
            id="cover_letter"
            value={editState.cover_letter}
            onChange={(event) =>
              setEditState((prev) => ({ ...prev, cover_letter: event.target.value }))
            }
          />
        </div>

        <div className="space-y-3 rounded-md border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">Documents</p>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <Input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
            />
            <Button
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload PDF"}
            </Button>
          </div>

          <div className="space-y-2">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
              >
                <a
                  className="truncate text-sm font-medium text-slate-700 underline"
                  href={document.file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {document.file_name}
                </a>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {formatFileSize(document.file_size)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleteMutation.isPending && deletingDocumentId === document.id}
                    onClick={() => deleteMutation.mutate(document.id)}
                  >
                    {deleteMutation.isPending && deletingDocumentId === document.id
                      ? "Deleting..."
                      : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents yet.</p>
            ) : null}
          </div>
        </div>
  
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
