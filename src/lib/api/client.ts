import type {
  ApplicationRow,
  CareerType,
  DocumentRow,
  EventRow,
  SourceType,
  StageType,
} from "@/lib/supabase/types";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiOptions {
  method?: Method;
  body?: unknown;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
}

export type ApplicationDetail = ApplicationRow & {
  events: EventRow[];
  documents: DocumentRow[];
};

export interface CreateApplicationPayload {
  company_name: string;
  position: string;
  career_type: CareerType;
  job_url?: string | null;
  source?: SourceType | null;
  merit_tags?: string[];
  current_stage?: StageType;
  company_memo?: string | null;
  cover_letter?: string | null;
  deadline?: string;
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;

  try {
    const parsed = (await response.json()) as { error?: string };
    return parsed.error ?? fallback;
  } catch {
    return fallback;
  }
};

const request = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const authApi = {
  register: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: payload,
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: payload,
    }),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
};

export const applicationsApi = {
  create: (payload: CreateApplicationPayload) =>
    request<ApplicationRow>("/api/applications", {
      method: "POST",
      body: payload,
    }),
  list: (params?: { stage?: StageType; search?: string }) => {
    const search = new URLSearchParams();
    if (params?.stage) {
      search.set("stage", params.stage);
    }
    if (params?.search) {
      search.set("search", params.search);
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    return request<{ applications: ApplicationRow[] }>(`/api/applications${suffix}`);
  },
  get: (id: string) => request<ApplicationDetail>(`/api/applications/${id}`),
  update: (
    id: string,
    body: Partial<
      Pick<
        ApplicationRow,
        "position" | "company_memo" | "current_stage" | "job_url" | "cover_letter"
      >
    >
  ) =>
    request<ApplicationRow>(`/api/applications/${id}`, {
      method: "PATCH",
      body,
    }),
};
