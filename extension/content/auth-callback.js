(function () {
  function extractAndSaveToken(container) {
    const token = container.getAttribute("data-extension-token");
    const expiresAt = container.getAttribute("data-extension-expires-at");

    if (!token || !expiresAt) return false;

    chrome.storage.local.set({
      authToken: token,
      tokenExpiresAt: expiresAt,
      apiBase: window.location.origin,
    });

    return true;
  }

  // 이미 DOM에 토큰이 있는 경우 (content script가 늦게 실행됨)
  const existing = document.getElementById("extension-token-container");
  if (existing && extractAndSaveToken(existing)) {
    return;
  }

  // 아직 없으면 MutationObserver로 대기
  // 인증 시작 전에 선택한 apiBase가 있더라도, 실제 콜백 origin으로 최종 동기화한다.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // 새 노드 추가 감지
      if (mutation.type === "childList") {
        const container = document.getElementById("extension-token-container");
        if (container && extractAndSaveToken(container)) {
          observer.disconnect();
          return;
        }
      }

      // 속성 변경 감지
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "data-extension-token"
      ) {
        if (extractAndSaveToken(mutation.target)) {
          observer.disconnect();
          return;
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-extension-token"],
  });
})();
