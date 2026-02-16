import type {
  ApplicationRow,
  CareerType,
  DocumentRow,
  EventType,
  EventRow,
  SourceType,
  StageType,
} from "@/lib/supabase/types";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiOptions {
  method?: Method;
  body?: unknown;
  headers?: HeadersInit;
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

export interface UpdateApplicationPayload {
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

export interface CreateEventPayload {
  event_type: EventType;
  scheduled_at: string;
  location?: string | null;
  interview_round?: number | null;
}

export interface UpdateEventPayload {
  event_type?: EventType;
  scheduled_at?: string;
  location?: string | null;
  interview_round?: number | null;
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
  const isFormData = options.body instanceof FormData;
  const hasBody = options.body !== undefined;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(path, {
    credentials: "include",
    method: options.method ?? "GET",
    headers,
    ...(hasBody
      ? {
          body: isFormData ? (options.body as FormData) : JSON.stringify(options.body),
        }
      : {}),
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
    body: UpdateApplicationPayload
  ) =>
    request<ApplicationRow>(`/api/applications/${id}`, {
      method: "PATCH",
      body,
    }),
};

export const eventsApi = {
  list: (applicationId: string) =>
    request<EventRow[]>(`/api/applications/${applicationId}/events`),
  create: (applicationId: string, payload: CreateEventPayload) =>
    request<EventRow>(`/api/applications/${applicationId}/events`, {
      method: "POST",
      body: payload,
    }),
  update: (eventId: string, payload: UpdateEventPayload) =>
    request<EventRow>(`/api/events/${eventId}`, {
      method: "PATCH",
      body: payload,
    }),
  remove: (eventId: string) =>
    request<void>(`/api/events/${eventId}`, {
      method: "DELETE",
    }),
};

export const documentsApi = {
  upload: (applicationId: string, file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    return request<DocumentRow>(`/api/applications/${applicationId}/documents`, {
      method: "POST",
      body: formData,
    });
  },
  remove: (documentId: string) =>
    request<void>(`/api/documents/${documentId}`, {
      method: "DELETE",
    }),
};
