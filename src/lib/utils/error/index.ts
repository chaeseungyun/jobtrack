import { AppError } from "@/lib/core/errors";

export const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  // Node fetch (undici 기반)
  const cause = (error as any).cause;

  const networkErrorCodes = [
    "ENOTFOUND",
    "ECONNREFUSED",
    "ECONNRESET",
    "EAI_AGAIN",
    "ETIMEDOUT",
  ];

  if (cause && typeof cause === "object") {
    if ("code" in cause && networkErrorCodes.includes(cause.code)) {
      return true;
    }
  }

  // 브라우저 fetch fallback
  if (error.message.includes("fetch failed")) {
    return true;
  }

  return false;
};

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof AppError && error.code === "NOT_FOUND";
};
