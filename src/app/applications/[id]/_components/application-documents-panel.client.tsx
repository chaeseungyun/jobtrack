"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { documentsApi } from "@/lib/api/client";
import type { DocumentRow } from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApplicationDocumentsPanelProps {
  applicationId: string;
  initialDocuments: DocumentRow[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENTS_TOAST_ID = {
  uploadSuccess: "application-documents-upload-success",
  uploadError: "application-documents-upload-error",
  deleteSuccess: "application-documents-delete-success",
  deleteError: "application-documents-delete-error",
} as const;

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
};

export function ApplicationDocumentsPanel({
  applicationId,
  initialDocuments,
}: ApplicationDocumentsPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) {
        throw new Error("파일을 선택해주세요");
      }

      if (selectedFile.type !== "application/pdf") {
        throw new Error("PDF 파일만 업로드할 수 있습니다");
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        throw new Error("파일 크기는 10MB 이하여야 합니다");
      }

      return documentsApi.upload(applicationId, selectedFile);
    },
    onSuccess: (uploaded) => {
      setDocuments((prev) => [uploaded, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("업로드 완료", { id: DOCUMENTS_TOAST_ID.uploadSuccess });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "업로드 실패";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      toast.error(message, { id: DOCUMENTS_TOAST_ID.uploadError });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => documentsApi.remove(documentId),
    onMutate: (documentId) => {
      setDeletingDocumentId(documentId);
    },
    onSuccess: (_, documentId) => {
      setDocuments((prev) => prev.filter((document) => document.id !== documentId));
      toast.success("삭제 완료", { id: DOCUMENTS_TOAST_ID.deleteSuccess });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "삭제 실패";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      toast.error(message, { id: DOCUMENTS_TOAST_ID.deleteError });
    },
    onSettled: () => {
      setDeletingDocumentId(null);
    },
  });

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">문서</p>

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
          {uploadMutation.isPending ? "업로드 중..." : "PDF 업로드"}
        </Button>
      </div>

      <div className="space-y-2">
        {documents.map((document) => (
          <div
            key={document.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
          >
            <a
              className="truncate text-sm font-medium text-foreground underline"
              href={document.file_url}
              target="_blank"
              rel="noreferrer"
            >
              {document.file_name}
            </a>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
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
                  ? "삭제 중..."
                  : "삭제"}
              </Button>
            </div>
          </div>
        ))}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 문서가 없습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
