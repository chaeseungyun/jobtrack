export async function saveToken(token, expiresAt) {
  await chrome.storage.local.set({ authToken: token, tokenExpiresAt: expiresAt });
}

export async function getValidToken() {
  const { authToken, tokenExpiresAt } = await chrome.storage.local.get([
    "authToken",
    "tokenExpiresAt",
  ]);

  if (!authToken || !tokenExpiresAt) {
    return null;
  }

  if (new Date(tokenExpiresAt) < new Date()) {
    await clearToken();
    return null;
  }

  return authToken;
}

export async function clearToken() {
  await chrome.storage.local.remove(["authToken", "tokenExpiresAt", "apiBase"]);
}
