import { getValidToken, clearToken } from "../utils/auth.js";
import { ensureApiBase, getApiBase, parseHtml, createApplication } from "../utils/api.js";
import { matchSite } from "../utils/sites.js";
import { extractJobHtml } from "../content/extractor.js";

const views = {
  loading: document.getElementById("view-loading"),
  login: document.getElementById("view-login"),
  main: document.getElementById("view-main"),
  confirm: document.getElementById("view-confirm"),
  form: document.getElementById("view-form"),
  success: document.getElementById("view-success"),
};

const SOURCE_LABELS = {
  saramin: "사람인",
  jobkorea: "잡코리아",
  company: "회사 홈페이지",
  linkedin: "LinkedIn",
  etc: "기타",
};

const CAREER_TYPES = new Set(["new", "experienced", "any"]);
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const SAVE_BTN_LABEL_DEFAULT = "이 공고 저장하기";
const SAVE_BTN_LABEL_RETRY = "재시도";

function setSaveButtonLabel(text) {
  const btn = document.getElementById("btn-save");
  if (btn) btn.textContent = text;
}

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

function setSiteStatus(text) {
  document.getElementById("site-status").textContent = text;
}

function setFormError(message) {
  const el = document.getElementById("form-error");
  if (!message) {
    el.hidden = true;
    el.textContent = "";
  } else {
    el.hidden = false;
    el.textContent = message;
  }
}

function setLoadingHint(text) {
  const el = document.getElementById("loading-hint");
  if (!text) {
    el.hidden = true;
    el.textContent = "";
  } else {
    el.hidden = false;
    el.textContent = text;
  }
}

function setLoginNotice(text) {
  const el = document.getElementById("login-notice");
  if (!text) {
    el.hidden = true;
    el.textContent = "";
  } else {
    el.hidden = false;
    el.textContent = text;
  }
}

async function showError({ context, errorType }) {
  if (errorType === "auth") {
    await clearToken();
    setLoginNotice("로그인이 만료되었습니다. 다시 로그인해주세요.");
    showView("login");
    return;
  }

  const message =
    errorType === "network"
      ? "연결할 수 없습니다. 인터넷 연결을 확인해주세요."
      : context === "save"
        ? "저장에 실패했습니다."
        : "분석에 실패했습니다. 다시 시도해주세요.";

  if (context === "save") {
    setFormError(message);
    return;
  }

  setSiteStatus(message);
  setSaveButtonLabel(SAVE_BTN_LABEL_RETRY);
  showView("main");
}

function toDeadlineInput(iso) {
  if (!iso) return "";
  const match = String(iso).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function toDeadlineIso(dateStr) {
  if (!dateStr) return null;
  return `${dateStr}T23:59:59+09:00`;
}

async function init() {
  setLoadingHint("");
  setFormError("");
  setLoginNotice("");
  setSaveButtonLabel(SAVE_BTN_LABEL_DEFAULT);
  showView("loading");

  const token = await getValidToken();
  if (!token) {
    showView("login");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  state.tab = tab || null;

  document.getElementById("current-url").textContent = url;

  const site = matchSite(url);
  state.site = site;

  if (site) {
    setSiteStatus(site.name);
    document.getElementById("btn-save").hidden = false;
    document.getElementById("unsupported-msg").hidden = true;
  } else {
    setSiteStatus("미지원 사이트");
    document.getElementById("btn-save").hidden = true;
    document.getElementById("unsupported-msg").hidden = false;
  }

  showView("main");
}

async function handleSaveClick() {
  if (!state.tab?.id || !state.site) {
    return;
  }

  setLoadingHint("");
  setFormError("");
  showView("loading");

  const hintTimer = setTimeout(
    () => setLoadingHint("시간이 걸리고 있습니다..."),
    5000,
  );

  try {
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: state.tab.id },
      func: extractJobHtml,
      args: [state.site],
    });
    const extraction = injectionResult?.result;

    if (!extraction?.html) {
      setSiteStatus("공고 본문을 찾지 못했습니다.");
      showView("main");
      return;
    }

    if (new Blob([extraction.html]).size > MAX_HTML_BYTES) {
      setSiteStatus("공고 본문이 너무 큽니다 (5MB 초과). 다른 페이지에서 시도해주세요.");
      showView("main");
      return;
    }

    state.extraction = extraction;

    const response = await parseHtml(state.tab.url, extraction.html, {
      bypassCache: true,
    });

    if (!response.ok) {
      await showError({ context: "parse", errorType: response.errorType });
      return;
    }

    state.parsedJob = response.data;
    renderConfirm(response.data, extraction.title);
    showView("confirm");
  } catch (error) {
    console.error("[JobTrack] Save flow failed", error);
    await showError({ context: "parse", errorType: "http" });
  } finally {
    clearTimeout(hintTimer);
    setLoadingHint("");
  }
}

async function renderSuccess({ title, message, id }) {
  document.getElementById("success-title").textContent = title;
  document.getElementById("success-message").textContent = message;

  const apiBase = await getApiBase();
  const link = document.getElementById("link-view");
  link.href = id ? `${apiBase}/applications/${id}` : `${apiBase}/applications`;

  showView("success");
}

function renderConfirm(parsed, fallbackTitle) {
  const company = parsed?.company_name?.trim();
  const position = parsed?.position?.trim();
  let title = "";
  if (company && position) {
    title = `${company} — ${position}`;
  } else if (position) {
    title = position;
  } else if (company) {
    title = company;
  } else {
    title = fallbackTitle || "공고 정보";
  }
  document.getElementById("confirm-title").textContent = title;
}

function fillForm(parsed) {
  const company = parsed?.company_name ?? "";
  const position = parsed?.position ?? "";
  const careerType = CAREER_TYPES.has(parsed?.career_type) ? parsed.career_type : "any";
  const source = parsed?.source ?? "etc";
  const deadline = toDeadlineInput(parsed?.deadline);

  document.getElementById("field-company").value = company;
  document.getElementById("field-position").value = position;
  document.getElementById("field-career-type").value = careerType;
  document.getElementById("field-deadline").value = deadline;
  document.getElementById("field-source").value = source;
  document.getElementById("field-source-label").textContent =
    SOURCE_LABELS[source] || SOURCE_LABELS.etc;
  document.getElementById("field-url").value = state.tab?.url || "";

  setFormError("");
}

async function handleSubmit() {
  const company = document.getElementById("field-company").value.trim();
  const position = document.getElementById("field-position").value.trim();
  const careerType = document.getElementById("field-career-type").value;
  const deadlineDate = document.getElementById("field-deadline").value;
  const source = document.getElementById("field-source").value || "etc";
  const jobUrl = document.getElementById("field-url").value || state.tab?.url || "";

  if (!company || !position) {
    setFormError("회사명과 포지션은 필수입니다.");
    return;
  }

  setFormError("");

  const payload = {
    company_name: company,
    position,
    career_type: careerType,
    source,
    job_url: jobUrl,
    deadline: toDeadlineIso(deadlineDate),
  };

  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;

  try {
    const response = await createApplication(payload);

    if (!response.ok) {
      if (response.status === 409) {
        await renderSuccess({
          title: "이미 저장된 공고입니다.",
          message: "JobTrack에서 기존 지원서를 확인할 수 있습니다.",
          id: response.data?.id,
        });
        return;
      }
      await showError({ context: "save", errorType: response.errorType });
      return;
    }

    await renderSuccess({
      title: "저장 완료!",
      message: "JobTrack에서 저장된 지원서를 확인할 수 있습니다.",
      id: response.data?.id,
    });
  } finally {
    submitBtn.disabled = false;
  }
}

document.getElementById("btn-login").addEventListener("click", async () => {
  const apiBase = await ensureApiBase();
  setLoginNotice("");
  chrome.tabs.create({ url: `${apiBase}/auth?from=extension` });
});

document.getElementById("btn-save").addEventListener("click", handleSaveClick);

document.getElementById("btn-logout").addEventListener("click", async () => {
  await clearToken();
  showView("login");
});

document.getElementById("btn-confirm").addEventListener("click", () => {
  if (!state.parsedJob) return;
  fillForm(state.parsedJob);
  showView("form");
});

document.getElementById("btn-other").addEventListener("click", () => {
  // Step 6-4에서 구현
  setSiteStatus("다른 공고 선택은 아직 지원되지 않습니다.");
  setSaveButtonLabel(SAVE_BTN_LABEL_DEFAULT);
  showView("main");
});

document.getElementById("btn-cancel").addEventListener("click", () => {
  setFormError("");
  setSaveButtonLabel(SAVE_BTN_LABEL_DEFAULT);
  showView("main");
});

document.getElementById("btn-submit").addEventListener("click", handleSubmit);

init();
