import { getToken } from "./lib/storage.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getRoot(root) {
  if (root) {
    return root;
  }

  const fallbackRoot = document.getElementById("popup-root");

  if (!fallbackRoot) {
    throw new Error("Popup root element was not found.");
  }

  return fallbackRoot;
}

async function getActiveTabSnapshot() {
  const tabs = await globalThis.browser?.tabs?.query({
    active: true,
    currentWindow: true,
  });
  const activeTab = tabs?.[0] ?? {};

  return {
    url: String(activeTab.url ?? ""),
    title: String(activeTab.title ?? ""),
  };
}

function renderSignedOut(root) {
  root.innerHTML = `
    <section class="popup-card">
      <p class="popup-eyebrow">Reading River</p>
      <h1 class="popup-title">Sign in to Reading River</h1>
      <p class="popup-copy">Use your Reading River account to save articles from Firefox.</p>
      <form class="popup-form" novalidate>
        <label class="popup-field">
          <span class="popup-label">Email address</span>
          <input class="popup-input" name="email" type="email" autocomplete="email" required />
        </label>
        <label class="popup-field">
          <span class="popup-label">Password</span>
          <input
            class="popup-input"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>
        <div class="popup-actions">
          <button class="popup-button" type="submit">Sign in</button>
        </div>
      </form>
    </section>
  `;

  root.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

function updateSaveButtonState(form) {
  const priorityField = form.querySelector('[name="priorityScore"]');
  const saveButton = form.querySelector('button[type="submit"]');

  if (!(priorityField instanceof HTMLInputElement) || !(saveButton instanceof HTMLButtonElement)) {
    return;
  }

  const syncState = () => {
    saveButton.disabled = priorityField.value.trim().length === 0;
  };

  priorityField.addEventListener("input", syncState);
  syncState();
}

function renderSignedIn(root, activeTab) {
  root.innerHTML = `
    <section class="popup-card">
      <p class="popup-eyebrow">Signed in</p>
      <h1 class="popup-title">Save this page</h1>
      <p class="popup-copy">Capture the current tab with a priority score so it’s ready for later.</p>
      <form class="popup-form" novalidate>
        <label class="popup-field">
          <span class="popup-label">URL</span>
          <input class="popup-input" name="url" type="url" required value="${escapeHtml(
            activeTab.url,
          )}" />
        </label>
        <label class="popup-field">
          <span class="popup-label">Title</span>
          <input class="popup-input" name="title" type="text" value="${escapeHtml(
            activeTab.title,
          )}" />
        </label>
        <label class="popup-field">
          <span class="popup-label">Priority</span>
          <input
            class="popup-input"
            name="priorityScore"
            type="number"
            min="0"
            max="10"
            step="1"
            required
          />
        </label>
        <div class="popup-actions">
          <button class="popup-button" type="submit" disabled>Save article</button>
        </div>
      </form>
    </section>
  `;

  const form = root.querySelector("form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });
    updateSaveButtonState(form);
  }
}

export async function bootPopup(root) {
  const popupRoot = getRoot(root);
  const token = await getToken();

  if (!token) {
    renderSignedOut(popupRoot);
    return;
  }

  const activeTab = await getActiveTabSnapshot();
  renderSignedIn(popupRoot, activeTab);
}

async function autoBootPopup() {
  const popupRoot = document.getElementById("popup-root");

  if (!popupRoot) {
    return;
  }

  await bootPopup(popupRoot);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        void autoBootPopup();
      },
      { once: true },
    );
  } else {
    void autoBootPopup();
  }
}
