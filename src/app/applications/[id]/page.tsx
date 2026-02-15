"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { applicationsApi, type ApplicationDetail } from "@/lib/api/client";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/app/stages";
import type { StageType } from "@/lib/supabase/types";

import { AppShell } from "@/components/app/app-shell";
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

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await applicationsApi.get(params.id);
        setDetail(result);
        setEditState({
          position: result.position,
          current_stage: result.current_stage,
          company_memo: result.company_memo ?? "",
          job_url: result.job_url ?? "",
          cover_letter: result.cover_letter ?? "",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load";
        if (message === "Unauthorized") {
          router.replace("/auth");
          return;
        }
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [params.id, router]);

  const handleSave = async () => {
    if (!detail || !editState) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await applicationsApi.update(detail.id, {
        position: editState.position,
        current_stage: editState.current_stage,
        company_memo: editState.company_memo || null,
        job_url: editState.job_url || null,
        cover_letter: editState.cover_letter || null,
      });

      setDetail((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
            }
          : prev
      );
      setSuccessMessage("Saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="Application Detail"
      description="Review and update stage, notes, and links from a single view."
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link className="text-sm font-medium text-slate-700 underline" href="/board">
          Back to board
        </Link>
        {detail ? <Badge>{STAGE_LABELS[detail.current_stage]}</Badge> : null}
      </div>

      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {isLoading || !detail || !editState ? (
        <p className="text-sm text-slate-500">Loading detail...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{detail.company_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={editState.position}
                  onChange={(event) =>
                    setEditState((prev) =>
                      prev
                        ? {
                            ...prev,
                            position: event.target.value,
                          }
                        : prev
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={editState.current_stage}
                  onValueChange={(value) =>
                    setEditState((prev) =>
                      prev
                        ? {
                            ...prev,
                            current_stage: value as StageType,
                          }
                        : prev
                    )
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
                    setEditState((prev) =>
                      prev
                        ? {
                            ...prev,
                            job_url: event.target.value,
                          }
                        : prev
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_memo">Company memo</Label>
                <Textarea
                  id="company_memo"
                  value={editState.company_memo}
                  onChange={(event) =>
                    setEditState((prev) =>
                      prev
                        ? {
                            ...prev,
                            company_memo: event.target.value,
                          }
                        : prev
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_letter">Cover letter memo</Label>
                <Textarea
                  id="cover_letter"
                  value={editState.cover_letter}
                  onChange={(event) =>
                    setEditState((prev) =>
                      prev
                        ? {
                            ...prev,
                            cover_letter: event.target.value,
                          }
                        : prev
                    )
                  }
                />
              </div>

              <Button onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.events.map((event) => (
                <div key={event.id} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant="outline">{event.event_type}</Badge>
                    <span className="text-xs text-slate-500">
                      {DATE_FORMATTER.format(new Date(event.scheduled_at))}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{event.location ?? "-"}</p>
                </div>
              ))}
              {detail.events.length === 0 ? (
                <p className="text-sm text-slate-500">No events yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
