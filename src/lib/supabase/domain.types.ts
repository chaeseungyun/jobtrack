import type { Database } from "@/lib/supabase/database.generated";

export const CAREER_TYPES = ["new", "experienced", "any"] as const;
export const SOURCE_TYPES = [
  "saramin",
  "jobkorea",
  "company",
  "linkedin",
  "etc",
] as const;
export const STAGE_TYPES = [
  "interest",
  "applied",
  "document_pass",
  "assignment",
  "interview",
  "final_pass",
  "rejected",
] as const;
export const EVENT_TYPES = ["deadline", "coding_test", "interview", "result", "etc"] as const;

export type CareerType = (typeof CAREER_TYPES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type StageType = (typeof STAGE_TYPES)[number];
export type EventType = (typeof EVENT_TYPES)[number];

type PublicTables = Database["public"]["Tables"];

export type UserRow = PublicTables["users"]["Row"];
export type DocumentRow = PublicTables["documents"]["Row"];

type RawApplicationRow = PublicTables["applications"]["Row"];
type RawApplicationInsert = PublicTables["applications"]["Insert"];
type RawApplicationUpdate = PublicTables["applications"]["Update"];

export type ApplicationRow = Omit<
  RawApplicationRow,
  "career_type" | "source" | "current_stage"
> & {
  career_type: CareerType;
  source: SourceType | null;
  current_stage: StageType;
  events?: EventRow[];
  documents?: DocumentRow[];
};

export type ApplicationInsert = Omit<
  RawApplicationInsert,
  "career_type" | "source" | "current_stage"
> & {
  career_type: CareerType;
  source?: SourceType | null;
  current_stage?: StageType;
};

export type ApplicationUpdate = Omit<
  RawApplicationUpdate,
  "career_type" | "source" | "current_stage"
> & {
  career_type?: CareerType;
  source?: SourceType | null;
  current_stage?: StageType;
};

type RawEventRow = PublicTables["events"]["Row"];
type RawEventInsert = PublicTables["events"]["Insert"];
type RawEventUpdate = PublicTables["events"]["Update"];

export type EventRow = Omit<RawEventRow, "event_type"> & {
  event_type: EventType;
};

export type EventInsert = Omit<RawEventInsert, "event_type"> & {
  event_type: EventType;
};

export type EventUpdate = Omit<RawEventUpdate, "event_type"> & {
  event_type?: EventType;
};
