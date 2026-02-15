import type {
  ApplicationRow,
  DocumentRow,
  EventRow,
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
