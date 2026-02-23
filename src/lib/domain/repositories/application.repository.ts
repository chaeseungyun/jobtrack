import type {
  ApplicationRow,
  StageType,
  CareerType,
  SourceType,
} from "@/lib/supabase/types";

export interface CreateApplicationInput {
  company_name: string;
  position: string;
  career_type: CareerType;
  job_url?: string | null;
  source?: SourceType | null;
  merit_tags?: string[];
  current_stage?: StageType;
  company_memo?: string | null;
  cover_letter?: string | null;
}

export interface UpdateApplicationInput {
  company_name?: string;
  position?: string;
  career_type?: CareerType;
  job_url?: string | null;
  source?: SourceType | null;
  merit_tags?: string[];
  current_stage?: StageType;
  company_memo?: string | null;
  cover_letter?: string | null;
}

export interface IApplicationRepository {
  findMany(
    userId: string,
    params?: { stage?: StageType; search?: string },
  ): Promise<ApplicationRow[]>;
  findById(id: string, userId: string): Promise<ApplicationRow | null>;
  existsForUser(id: string, userId: string): Promise<boolean>;
  create(
    userId: string,
    input: CreateApplicationInput,
  ): Promise<ApplicationRow>;
  update(
    id: string,
    userId: string,
    input: UpdateApplicationInput,
  ): Promise<ApplicationRow>;
  remove(id: string, userId: string): Promise<void>;
}
