// Synced with src/lib/core/config/adapter.config.ts
// Extension only needs hostname, content selectors, and remove selectors.
// Server-only fields (render_js, version) are omitted.

export const SITE_CONFIGS = [
  {
    key: "saramin.co.kr",
    hostname: "saramin.co.kr",
    name: "사람인",
    content: [".wrap_jv_cont"],
    remove: ["script", ".wrap_recommend_slide"],
  },
  {
    key: "jobkorea.co.kr",
    hostname: "jobkorea.co.kr",
    name: "잡코리아",
    content: ["._1v41msv0"],
    remove: ["script", "button"],
  },
];

export const GENERIC_CONFIG = {
  key: "generic",
  hostname: null,
  name: "기타",
  content: ["main", "article", "#content", "body"],
  remove: ["script", "style", "noscript", "iframe"],
};

/**
 * Match a URL against supported site configs.
 * Returns the matching site config, or null if no supported site matches.
 */
export function matchSite(url) {
  try {
    const { hostname } = new URL(url);
    return SITE_CONFIGS.find((site) => hostname.includes(site.hostname)) || null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the URL belongs to a supported (non-generic) job site.
 */
export function isSupportedSite(url) {
  return matchSite(url) !== null;
}
