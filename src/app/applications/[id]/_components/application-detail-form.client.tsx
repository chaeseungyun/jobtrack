"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { applicationsApi } from "@/lib/api/client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import type { ApplicationRow, StageType } from "@/lib/supabase/types";

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
}

export function ApplicationDetailForm({
  initialApplication,
}: ApplicationDetailFormProps) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [editState, setEditState] = useState<EditState>({
    position: initialApplication.position,
    current_stage: initialApplication.current_stage,
    company_memo: initialApplication.company_memo ?? "",
    job_url: initialApplication.job_url ?? "",
    cover_letter: initialApplication.cover_letter ?? "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setSuccessMessage("Saved");
      setErrorMessage(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Update failed";

      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }

      setErrorMessage(message);
      setSuccessMessage(null);
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
        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

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

        <Button
          onClick={() => {
            setSuccessMessage(null);
            saveMutation.mutate();
          }}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
