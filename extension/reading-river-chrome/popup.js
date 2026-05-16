import { ApiError, login as loginRequest, save as saveRequest } from "./lib/api-client.js";
import { clearToken, getToken, setToken } from "./lib/storage.js";

const READING_SPEED_WORDS_PER_MINUTE = 200;

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

function getNamedField(form, name) {
  const field = form.elements.namedItem(name);

  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
    throw new Error(`Expected field named ${name}.`);
  }

  return field;
}

function getStatusElement(form) {
  const status = form.querySelector("[data-popup-status]");

  return status instanceof HTMLElement ? status : null;
}

function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.hidden !== undefined) {
    element.hidden = options.hidden;
  }

  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) {
      if (value === false || value === null || value === undefined) {
        continue;
      }

      if (value === true) {
        element.setAttribute(name, "");
        continue;
      }

      element.setAttribute(name, String(value));
    }
  }

  if (options.properties) {
    Object.assign(element, options.properties);
  }

  if (options.children) {
    element.append(...options.children);
  }

  return element;
}

function createField(labelText, inputOptions) {
  const label = createElement("label", {
    className: "popup-field",
  });
  const labelTextElement = createElement("span", {
    className: "popup-label",
    text: labelText,
  });
  const input = createElement("input", inputOptions);

  label.append(labelTextElement, input);

  return label;
}

function createSelectField(labelText, selectOptions, optionDefinitions, helperText = "") {
  const fieldName =
    typeof selectOptions?.properties?.name === "string" && selectOptions.properties.name
      ? selectOptions.properties.name
      : labelText.toLowerCase().replace(/\s+/g, "-");
  const selectId =
    typeof selectOptions?.properties?.id === "string" && selectOptions.properties.id
      ? selectOptions.properties.id
      : `popup-${fieldName}`;
  const helperId = `${selectId}-help`;
  const field = createElement("div", {
    className: "popup-field",
  });
  const labelTextElement = createElement("label", {
    className: "popup-label",
    text: labelText,
    properties: {
      htmlFor: selectId,
    },
  });
  const select = createElement("select", selectOptions);

  select.id = selectId;

  if (helperText) {
    select.setAttribute("aria-describedby", helperId);
  }

  select.append(
    ...optionDefinitions.map(({ label: optionLabel, value, disabled = false }) =>
      createElement("option", {
        text: optionLabel,
        properties: {
          value,
          disabled,
        },
      }),
    ),
  );

  if (optionDefinitions.some((option) => option.value === "")) {
    select.value = "";
  }

  field.append(labelTextElement, select);

  if (helperText) {
    field.append(
      createElement("p", {
        className: "popup-help",
        text: helperText,
        properties: {
          id: helperId,
        },
      }),
    );
  }

  return field;
}

function createCard(children) {
  return createElement("section", {
    className: "popup-card",
    children,
  });
}

function createStatusMessage() {
  return createElement("p", {
    className: "popup-status",
    hidden: true,
    attributes: {
      "data-popup-status": true,
    },
  });
}

function createActions(buttonText, disabled = false) {
  const button = createElement("button", {
    className: "popup-button",
    text: buttonText,
    properties: {
      type: "submit",
      disabled,
    },
  });

  return createElement("div", {
    className: "popup-actions",
    children: [button],
  });
}

function replaceRoot(root, child) {
  root.replaceChildren(child);
}

function parsePopupPriorityScore(value) {
  return value === "none" ? null : Number(value);
}

function parsePopupEstimatedMinutes(value) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateReadingMinutes(text) {
  const wordCount = countWords(text);

  if (wordCount === 0) {
    return null;
  }

  return Math.max(1, Math.ceil(wordCount / READING_SPEED_WORDS_PER_MINUTE));
}

function getVisiblePageTextForReadingEstimate() {
  const root =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]') ||
    document.body;

  if (!root) {
    return "";
  }

  const clone = root.cloneNode(true);

  if (!(clone instanceof Element)) {
    return root.textContent || "";
  }

  clone
    .querySelectorAll("script, style, noscript, nav, header, footer, aside, form, button, svg")
    .forEach((element) => {
      element.remove();
    });

  return clone.textContent || "";
}

function isYouTubeVideoUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      return parsedUrl.pathname === "/watch" && parsedUrl.searchParams.has("v");
    }

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.length > 1;
    }

    return false;
  } catch {
    return false;
  }
}

function getYouTubeVideoMinutesFromPage() {
  function minutesFromSeconds(seconds) {
    return Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : null;
  }

  function parseIsoDuration(value) {
    if (typeof value !== "string") {
      return null;
    }

    const match = value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

    if (!match) {
      return null;
    }

    const days = Number(match[1] || 0);
    const hours = Number(match[2] || 0);
    const minutes = Number(match[3] || 0);
    const seconds = Number(match[4] || 0);

    return minutesFromSeconds(days * 86400 + hours * 3600 + minutes * 60 + seconds);
  }

  function parseClockDuration(value) {
    if (typeof value !== "string") {
      return null;
    }

    const parts = value
      .trim()
      .split(":")
      .map((part) => Number(part));

    if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }

    const seconds =
      parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];

    return minutesFromSeconds(seconds);
  }

  const metaDuration = document
    .querySelector('meta[itemprop="duration"]')
    ?.getAttribute("content");

  const metaMinutes = parseIsoDuration(metaDuration);

  if (metaMinutes) {
    return metaMinutes;
  }

  const playerSeconds = Number(globalThis.ytInitialPlayerResponse?.videoDetails?.lengthSeconds);
  const playerMinutes = minutesFromSeconds(playerSeconds);

  if (playerMinutes) {
    return playerMinutes;
  }

  const clockText = document.querySelector(".ytp-time-duration")?.textContent;
  return parseClockDuration(clockText);
}

async function estimateActiveTabReadingTime(tabId, url = "") {
  if (!Number.isInteger(tabId) || !globalThis.browser?.scripting?.executeScript) {
    return null;
  }

  const func = isYouTubeVideoUrl(url)
    ? getYouTubeVideoMinutesFromPage
    : getVisiblePageTextForReadingEstimate;

  try {
    const results = await globalThis.browser.scripting.executeScript({
      target: {
        tabId,
      },
      func,
    });
    const result = results?.[0]?.result;

    if (isYouTubeVideoUrl(url)) {
      return Number.isInteger(result) && result > 0 ? result : null;
    }

    return typeof result === "string" ? estimateReadingMinutes(result) : null;
  } catch {
    return null;
  }
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
  const tabId = typeof activeTab.id === "number" ? activeTab.id : null;
  const url = String(activeTab.url ?? "");
  const estimatedMinutes = await estimateActiveTabReadingTime(tabId, url);

  return {
    url,
    title: String(activeTab.title ?? ""),
    estimatedMinutes,
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

  const email = getNamedField(form, "email").value.trim();
  const password = getNamedField(form, "password").value;

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

  const url = getNamedField(form, "url").value.trim();
  const title = getNamedField(form, "title").value.trim();
  const priorityScore = parsePopupPriorityScore(getNamedField(form, "priorityScore").value);
  const estimatedMinutes = parsePopupEstimatedMinutes(getNamedField(form, "estimatedMinutes").value);

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
        estimatedMinutes,
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

    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.payload?.error === "duplicate_url"
    ) {
      setFormStatus(form, "That link is already in Reading River.", "alert");
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
  const form = createElement("form", {
    className: "popup-form",
    properties: {
      noValidate: true,
    },
    children: [
      createStatusMessage(),
      createField("Email address", {
        className: "popup-input",
        properties: {
          name: "email",
          type: "email",
          autocomplete: "email",
          required: true,
        },
      }),
      createField("Password", {
        className: "popup-input",
        properties: {
          name: "password",
          type: "password",
          autocomplete: "current-password",
          required: true,
        },
      }),
      createActions("Sign in"),
    ],
  });
  const card = createCard([
    createElement("p", {
      className: "popup-eyebrow",
      text: "Reading River",
    }),
    createElement("h1", {
      className: "popup-title",
      text: "Sign in to Reading River",
    }),
    createElement("p", {
      className: "popup-copy",
      text: "Use your Reading River account to save articles from Chrome.",
    }),
    form,
  ]);

  replaceRoot(root, card);

  form.addEventListener("submit", (event) => {
    void handleLoginSubmit(event, root);
  });

  if (message) {
    setFormStatus(form, message, role);
  }
}

function renderSignedIn(root, activeTab, token, message = "", role = "status") {
  const form = createElement("form", {
    className: "popup-form",
    properties: {
      noValidate: true,
    },
    children: [
      createStatusMessage(),
      createField("URL", {
        className: "popup-input",
        properties: {
          name: "url",
          type: "url",
          required: true,
          value: activeTab.url,
        },
      }),
      createField("Title", {
        className: "popup-input",
        properties: {
          name: "title",
          type: "text",
          value: activeTab.title,
        },
      }),
      createField("Estimated minutes", {
        className: "popup-input",
        properties: {
          name: "estimatedMinutes",
          type: "number",
          min: "1",
          inputMode: "numeric",
          value: activeTab.estimatedMinutes ? String(activeTab.estimatedMinutes) : "",
        },
      }),
      createSelectField(
        "Priority",
        {
          className: "popup-input",
          properties: {
            name: "priorityScore",
            required: true,
          },
        },
        [
          {
            label: "Choose priority setting",
            value: "",
            disabled: true,
          },
          {
            label: "No priority (stream only)",
            value: "none",
          },
          ...Array.from({ length: 10 }, (_, index) => {
            const value = index + 1;

            return {
              label: String(value),
              value: String(value),
            };
          }),
        ],
        "No priority keeps an item in the stream only, so it never appears in the left column.",
      ),
      createActions("Save article", true),
    ],
  });
  const card = createCard([
    createElement("p", {
      className: "popup-eyebrow",
      text: "Signed in",
    }),
    createElement("h1", {
      className: "popup-title",
      text: "Save this page",
    }),
    createElement("p", {
      className: "popup-copy",
      text: "Capture the current tab with a priority setting so it’s ready for later.",
    }),
    form,
  ]);

  replaceRoot(root, card);

  form.addEventListener("submit", (event) => {
    void handleSaveSubmit(event, root, token);
  });

  updateSaveButtonState(form);

  if (message) {
    setFormStatus(form, message, role);
  }
}

function renderBootError(root) {
  const card = createCard([
    createElement("p", {
      className: "popup-eyebrow",
      text: "Reading River",
    }),
    createElement("h1", {
      className: "popup-title",
      text: "Popup unavailable",
    }),
    createElement("p", {
      className: "popup-copy",
      text: "Unable to load Reading River. Please reopen the popup.",
      attributes: {
        role: "alert",
      },
    }),
  ]);

  replaceRoot(root, card);
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
