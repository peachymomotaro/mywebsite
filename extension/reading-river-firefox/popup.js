import { ApiError, login as loginRequest, save as saveRequest } from "./lib/api-client.js";
import { clearToken, getToken, setToken } from "./lib/storage.js";

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
      text: "Use your Reading River account to save articles from Firefox.",
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
      createField("Priority", {
        className: "popup-input",
        properties: {
          name: "priorityScore",
          type: "number",
          min: "0",
          max: "10",
          step: "1",
          required: true,
        },
      }),
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
      text: "Capture the current tab with a priority score so it’s ready for later.",
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
