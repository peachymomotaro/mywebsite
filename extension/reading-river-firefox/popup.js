import { ApiError, login as loginRequest, save as saveRequest } from "./lib/api-client.js";
import { clearToken, getToken, setToken } from "./lib/storage.js";

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

function getNamedInput(form, name) {
  const field = form.elements.namedItem(name);

  if (!(field instanceof HTMLInputElement)) {
    throw new Error(`Expected input named ${name}.`);
  }

  return field;
}

function getStatusElement(form) {
  const status = form.querySelector("[data-popup-status]");

  return status instanceof HTMLElement ? status : null;
}

function setFormStatus(form, message, role) {
  const status = getStatusElement(form);

  if (!status) {
    return;
  }

  if (!message) {
    status.hidden = true;
    status.textContent = "";
    status.removeAttribute("role");
    status.removeAttribute("aria-live");
    return;
  }

  status.hidden = false;
  status.textContent = message;
  status.setAttribute("role", role);
  status.setAttribute("aria-live", role === "alert" ? "assertive" : "polite");
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

function updateSaveButtonState(form) {
  const saveButton = form.querySelector('button[type="submit"]');

  if (!(saveButton instanceof HTMLButtonElement)) {
    return;
  }

  const syncState = () => {
    saveButton.disabled = !form.checkValidity();
  };

  form.addEventListener("input", syncState);
  form.addEventListener("change", syncState);
  syncState();
}

async function handleLoginSubmit(event, popupRoot) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!(submitButton instanceof HTMLButtonElement)) {
    return;
  }

  const email = getNamedInput(form, "email").value.trim();
  const password = getNamedInput(form, "password").value;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submitButton.disabled = true;
  setFormStatus(form, "Signing in...", "status");

  try {
    const result = await loginRequest({
      email,
      password,
    });

    const activeTab = await getActiveTabSnapshot();
    renderSignedIn(popupRoot, activeTab, result.token);
    await setToken(result.token);
  } catch {
    setFormStatus(form, "Could not sign in. Try again.", "alert");
  } finally {
    if (form.isConnected) {
      submitButton.disabled = false;
    }
  }
}

async function handleSaveSubmit(event, popupRoot, token) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!(submitButton instanceof HTMLButtonElement)) {
    return;
  }

  const url = getNamedInput(form, "url").value.trim();
  const title = getNamedInput(form, "title").value.trim();
  const priorityScore = Number(getNamedInput(form, "priorityScore").value);

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submitButton.disabled = true;
  setFormStatus(form, "Saving...", "status");

  try {
    await saveRequest(
      {
        url,
        title,
        priorityScore,
      },
      {
        token,
      },
    );

    setFormStatus(form, "Saved to Reading River.", "status");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearToken();
      renderSignedOut(popupRoot, "Your session expired. Sign in again.", "alert");
      return;
    }

    setFormStatus(form, "Could not save right now. Try again.", "alert");
  } finally {
    if (form.isConnected) {
      updateSaveButtonState(form);
    }
  }
}

function renderSignedOut(root, message = "", role = "alert") {
  root.innerHTML = `
    <section class="popup-card">
      <p class="popup-eyebrow">Reading River</p>
      <h1 class="popup-title">Sign in to Reading River</h1>
      <p class="popup-copy">Use your Reading River account to save articles from Firefox.</p>
      <form class="popup-form" novalidate>
        <p class="popup-status" data-popup-status hidden></p>
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

  const form = root.querySelector("form");

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  form.addEventListener("submit", (event) => {
    void handleLoginSubmit(event, root);
  });

  if (message) {
    setFormStatus(form, message, role);
  }
}

function renderSignedIn(root, activeTab, token, message = "", role = "status") {
  root.innerHTML = `
    <section class="popup-card">
      <p class="popup-eyebrow">Signed in</p>
      <h1 class="popup-title">Save this page</h1>
      <p class="popup-copy">Capture the current tab with a priority score so it’s ready for later.</p>
      <form class="popup-form" novalidate>
        <p class="popup-status" data-popup-status hidden></p>
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

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  form.addEventListener("submit", (event) => {
    void handleSaveSubmit(event, root, token);
  });

  updateSaveButtonState(form);

  if (message) {
    setFormStatus(form, message, role);
  }
}

function renderBootError(root) {
  root.innerHTML = `
    <section class="popup-card">
      <p class="popup-eyebrow">Reading River</p>
      <h1 class="popup-title">Popup unavailable</h1>
      <p class="popup-copy" role="alert">
        Unable to load Reading River. Please reopen the popup.
      </p>
    </section>
  `;
}

export async function bootPopup(root) {
  const popupRoot = getRoot(root);
  try {
    const token = await getToken();

    if (!token) {
      renderSignedOut(popupRoot);
      return;
    }

    const activeTab = await getActiveTabSnapshot();
    renderSignedIn(popupRoot, activeTab, token);
  } catch {
    renderBootError(popupRoot);
  }
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
