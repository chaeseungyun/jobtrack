import { getValidToken, clearToken } from "../utils/auth.js";
import { ensureApiBase } from "../utils/api.js";
import { matchSite } from "../utils/sites.js";

const views = {
  loading: document.getElementById("view-loading"),
  login: document.getElementById("view-login"),
  main: document.getElementById("view-main"),
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

  document.getElementById("current-url").textContent = url;

  const site = matchSite(url);

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

// 로그인 버튼
document.getElementById("btn-login").addEventListener("click", async () => {
  const apiBase = await ensureApiBase();
  chrome.tabs.create({ url: `${apiBase}/auth?from=extension` });
});

// 로그아웃 버튼
document.getElementById("btn-logout").addEventListener("click", async () => {
  await clearToken();
  showView("login");
});

init();
