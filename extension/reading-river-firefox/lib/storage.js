const STORAGE_TOKEN_KEY = "reading-river-extension-token";

function getStorageArea(storageArea = globalThis.browser?.storage?.local) {
  if (!storageArea) {
    throw new Error("Firefox storage is not available.");
  }

  return storageArea;
}

export async function getToken(storageArea = globalThis.browser?.storage?.local) {
  const area = getStorageArea(storageArea);
  const stored = await area.get(STORAGE_TOKEN_KEY);
  const token = stored?.[STORAGE_TOKEN_KEY];

  return typeof token === "string" && token.trim() ? token : null;
}

export async function setToken(token, storageArea = globalThis.browser?.storage?.local) {
  const area = getStorageArea(storageArea);

  if (typeof token !== "string" || !token.trim()) {
    await area.remove(STORAGE_TOKEN_KEY);
    return;
  }

  await area.set({
    [STORAGE_TOKEN_KEY]: token,
  });
}

export async function clearToken(storageArea = globalThis.browser?.storage?.local) {
  const area = getStorageArea(storageArea);

  await area.remove(STORAGE_TOKEN_KEY);
}

export { STORAGE_TOKEN_KEY };
