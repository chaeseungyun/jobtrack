/**
 * callbackUrl 경계 함수 (Boundary Utility)
 *
 * 인증 흐름에서 사용자 입력 callbackUrl을 안전한 내부 경로로 정규화한다.
 *
 * 허용 규칙:
 *   - `/`로 시작하는 상대 경로만 허용
 *   - `//`로 시작하는 protocol-relative URL 차단
 *   - `http://`, `https://`, `javascript:` 등 스킴 포함 URL 차단
 *   - null, undefined, 빈 문자열은 fallback 처리
 *
 * @module lib/auth/callback-url
 */

const DEFAULT_CALLBACK = "/dashboard";

/**
 * 주어진 callbackUrl이 안전한 내부 경로인지 검증하고,
 * 안전하지 않으면 fallback 경로를 반환한다.
 *
 * 서버/클라이언트 양쪽에서 사용 가능한 pure function.
 */
export function getSafeCallbackUrl(
  raw: string | null | undefined,
  fallback: string = DEFAULT_CALLBACK,
): string {
  if (!raw || typeof raw !== "string") {
    return fallback;
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return fallback;
  }

  // 상대 경로(`/`로 시작)만 허용, `//`(protocol-relative) 차단
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  // 스킴 포함 패턴 차단 (javascript:, data:, vbscript: 등)
  // URL 인코딩 우회 시도도 차단하기 위해 디코딩 후 검사
  try {
    const decoded = decodeURIComponent(trimmed);
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(decoded)) {
      return fallback;
    }
    // 디코딩 후에도 `//`로 시작하면 차단
    if (decoded.startsWith("//")) {
      return fallback;
    }
  } catch {
    // decodeURIComponent 실패 시 원본 사용 (malformed URI)
  }

  // 백슬래시 기반 우회 차단 (/\evil.com)
  if (trimmed.includes("\\")) {
    return fallback;
  }

  return trimmed;
}
