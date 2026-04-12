import { getValidToken, clearToken } from "../utils/auth.js";
import { ensureApiBase, parseHtml } from "../utils/api.js";
import { matchSite } from "../utils/sites.js";
import { extractJobHtml } from "../content/extractor.js";

const views = {
  loading: document.getElementById("view-loading"),
  login: document.getElementById("view-login"),
  main: document.getElementById("view-main"),
};

const state = {
  tab: null,
  site: null,
  extraction: null,
  parsedJob: null,
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
}

async function init() {
  showView("loading");

  const token = await getValidToken();
  if (!token) {
    showView("login");
    return;
  }

  // 현재 탭 URL 표시
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  state.tab = tab || null;

  document.getElementById("current-url").textContent = url;

  const site = matchSite(url);
  state.site = site;

  if (site) {
    document.getElementById("site-status").textContent = site.name;
    document.getElementById("btn-save").hidden = false;
    document.getElementById("unsupported-msg").hidden = true;
  } else {
    document.getElementById("site-status").textContent = "미지원 사이트";
    document.getElementById("btn-save").hidden = true;
    document.getElementById("unsupported-msg").hidden = false;
  }

  showView("main");
}

async function handleSaveClick() {
  if (!state.tab?.id || !state.site) {
    return;
  }

  showView("loading");

  try {
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: state.tab.id },
      func: extractJobHtml,
      args: [state.site],
    });
    const extraction = injectionResult?.result;

    if (!extraction?.html) {
      throw new Error("공고 HTML을 추출하지 못했습니다.");
    }

    state.extraction = extraction;
    console.log("[JobTrack] Extracted job HTML", {
      title: extraction.title,
      htmlLength: extraction.html.length,
      alternativesCount: extraction.alternatives?.length ?? 0,
    });

    const response = await parseHtml(state.tab.url, extraction.html, {
      bypassCache: true,
    });

    if (!response.ok) {
      throw new Error(response.errorMessage || "공고 파싱에 실패했습니다.");
    }

    state.parsedJob = response.data;
    console.log("[JobTrack] Parse HTML response", {
      ok: true,
      hasCompanyName: Boolean(response.data?.company_name),
      hasPosition: Boolean(response.data?.position),
      hasDeadline: Boolean(response.data?.deadline),
    });

    showView("main");
  } catch (error) {
    console.error("[JobTrack] Save flow failed", error);
    document.getElementById("site-status").textContent =
      error instanceof Error ? error.message : "공고 저장 준비 중 오류가 발생했습니다.";
    showView("main");
  }
}

// 로그인 버튼
document.getElementById("btn-login").addEventListener("click", async () => {
  const apiBase = await ensureApiBase();
  chrome.tabs.create({ url: `${apiBase}/auth?from=extension` });
});

document.getElementById("btn-save").addEventListener("click", handleSaveClick);

// 로그아웃 버튼
document.getElementById("btn-logout").addEventListener("click", async () => {
  await clearToken();
  showView("login");
});

init();
