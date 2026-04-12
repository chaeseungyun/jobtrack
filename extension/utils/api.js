import { getValidToken, clearToken } from "./auth.js";
import { getInitialApiBase } from "./config.js";

export async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  return apiBase || getInitialApiBase();
}

export async function ensureApiBase() {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  if (apiBase) {
    return apiBase;
  }

  const initialApiBase = getInitialApiBase();
  await chrome.storage.local.set({ apiBase: initialApiBase });
  return initialApiBase;
}

export async function apiCall(endpoint, options = {}) {
  const token = await getValidToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      data: null,
      errorType: "auth",
      errorMessage: "Missing or expired auth token",
    };
  }

  const apiBase = await getApiBase();
  const url = `${apiBase}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (response.status === 401) {
      await clearToken();
    }

    if (response.status === 204) {
      return {
        ok: response.ok,
        status: response.status,
        data: null,
        errorType: response.ok ? null : "http",
        errorMessage: response.ok ? null : "Request failed without a response body",
      };
    }

    let data = null;

    try {
      data = await response.json();
    } catch {
      return {
        ok: false,
        status: response.status,
        data: null,
        errorType: "parse",
        errorMessage: "Failed to parse JSON response",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data,
        errorType: "http",
        errorMessage:
          typeof data?.error === "string" ? data.error : `Request failed (${response.status})`,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      errorType: null,
      errorMessage: null,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      errorType: "network",
      errorMessage: "Network request failed",
    };
  }
}

export async function parseHtml(url, html) {
  return apiCall("/api/applications/parse-html", {
    method: "POST",
    body: { url, html },
  });
}

export async function createApplication(data) {
  return apiCall("/api/applications", {
    method: "POST",
    body: data,
  });
}
