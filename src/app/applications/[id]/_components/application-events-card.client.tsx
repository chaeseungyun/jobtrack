"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";

import { applicationDetailQueryKey } from "@/lib/query/applications";
import { applicationsApi, eventsApi } from "@/lib/api/client";
import { EVENT_TYPES, type EventType } from "@/lib/supabase/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApplicationEventsCardProps {
  applicationId: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  deadline: "Deadline",
  coding_test: "Coding Test",
  interview: "Interview",
  result: "Result",
  etc: "Etc",
};

interface EventFormState {
  event_type: EventType;
  scheduled_at: string;
  location: string;
}

const INITIAL_FORM: EventFormState = {
  event_type: "interview",
  scheduled_at: "",
  location: "",
};

export function ApplicationEventsCard({ applicationId }: ApplicationEventsCardProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(INITIAL_FORM);

  const { data: application } = useQuery({
    queryKey: applicationDetailQueryKey(applicationId),
    queryFn: () => applicationsApi.get(applicationId),
    staleTime: 30 * 1000,
  });

  const events = application?.events ?? [];

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!form.scheduled_at) throw new Error("Schedule is required");

      const payload = {
        event_type: form.event_type,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        location: form.location.trim() || null,
      };

      if (editingEventId) {
        return eventsApi.update(editingEventId, payload);
      }
      return eventsApi.create(applicationId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationDetailQueryKey(applicationId) });
      toast.success(editingEventId ? "Event updated" : "Event added");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Action failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationDetailQueryKey(applicationId) });
      toast.success("Event deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
  });

  const handleOpenAdd = () => {
    setEditingEventId(null);
    setForm(INITIAL_FORM);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (event: (typeof events)[0]) => {
    setEditingEventId(event.id);
    setForm({
      event_type: event.event_type,
      scheduled_at: new Date(event.scheduled_at).toISOString().slice(0, 16),
      location: event.location ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEventId(null);
    setForm(INITIAL_FORM);
  };

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Events</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="group relative rounded-md border border-slate-200 p-3 transition-colors hover:bg-slate-50"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <Badge variant="outline">{EVENT_TYPE_LABELS[event.event_type]}</Badge>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {DATE_FORMATTER.format(new Date(event.scheduled_at))}
                  </span>
                  <DropdownMenu>
                    {event.event_type !== "deadline" ? (
                      <>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(event)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this event?")) {
                                deleteMutation.mutate(event.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </>
                    ) : null}
                  </DropdownMenu>
                </div>
              </div>
              <p className="text-sm text-slate-600">{event.location ?? "-"}</p>
            </div>
          ))}
          {events.length === 0 ? <p className="text-sm text-slate-500">No events yet.</p> : null}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEventId ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event_type">Type</Label>
              <Select
                value={form.event_type}
                onValueChange={(v) => setForm((p) => ({ ...p, event_type: v as EventType }))}
              >
                <SelectTrigger id="event_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.filter((t) => t !== "deadline").map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scheduled_at">Schedule</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location / Link</Label>
              <Input
                id="location"
                placeholder="e.g. Zoom Link or Office address"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              disabled={upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
            >
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
