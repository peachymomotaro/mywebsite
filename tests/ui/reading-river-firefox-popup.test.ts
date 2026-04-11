import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "@/extension/reading-river-firefox/lib/api-client";

const storageKey = "reading-river-extension-token";

function createBrowserMock({
  token,
  activeTab,
  getReject,
  queryReject,
}: {
  token: string | null;
  activeTab: {
    url: string;
    title: string;
  };
  getReject?: Error | null;
  queryReject?: Error | null;
}) {
  let currentToken = token;

  const get = vi.fn(async (key: string) => {
    if (getReject) {
      throw getReject;
    }

    return {
      [key]: key === storageKey ? currentToken : undefined,
    };
  });
  const set = vi.fn(async (value: Record<string, string>) => {
    currentToken = value[storageKey] ?? null;
  });
  const remove = vi.fn(async (key: string) => {
    if (key === storageKey) {
      currentToken = null;
    }
  });
  const query = vi.fn(async () => {
    if (queryReject) {
      throw queryReject;
    }

    return [activeTab];
  });

  vi.stubGlobal("browser", {
    storage: {
      local: {
        get,
        set,
        remove,
      },
    },
    tabs: {
      query,
    },
  });

  return {
    get,
    set,
    remove,
    query,
  };
}

async function loadPopupModule({
  token = null,
  activeTab = {
    url: "https://example.com/article",
    title: "Saved from Firefox",
  },
  getReject = null,
  queryReject = null,
}: Partial<{
  token: string | null;
  activeTab: {
    url: string;
    title: string;
  };
  getReject: Error | null;
  queryReject: Error | null;
}> = {}) {
  document.body.innerHTML = '<main id="popup-root"></main>';
  const browser = createBrowserMock({ token, activeTab, getReject, queryReject });
  vi.resetModules();

  const popupModule = await import("@/extension/reading-river-firefox/popup");

  expect(popupModule.bootPopup).toEqual(expect.any(Function));

  return {
    browser,
    popupModule,
  };
}

describe("reading river firefox popup", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("loads the popup shell with an external module script", () => {
    const html = readFileSync(
      path.resolve(process.cwd(), "extension/reading-river-firefox/popup.html"),
      "utf8",
    );

    expect(html).toContain('<script type="module" src="./popup.js"></script>');
    expect(html).not.toContain("bootPopup()");
  });

  it("avoids innerHTML in the packaged popup renderer", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "extension/reading-river-firefox/popup.js"),
      "utf8",
    );

    expect(source).not.toContain("innerHTML");
  });

  it("requests only the activeTab permission in the manifest", () => {
    const manifest = JSON.parse(
      readFileSync(
        path.resolve(process.cwd(), "extension/reading-river-firefox/manifest.json"),
        "utf8",
      ),
    ) as {
      permissions?: string[];
      browser_specific_settings?: {
        gecko?: {
          data_collection_permissions?: {
            required?: string[];
          };
        };
      };
    };

    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).not.toContain("tabs");
    expect(manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required).toEqual([
      "none",
    ]);
  });

  it("sends extension API requests to the Reading River origin", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ token: "login-token" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }));

    await login(
      {
        email: "reader@example.com",
        password: "secret-password",
      },
      {
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://petercurry.org/reading-river/api/extension/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("renders the login form when no stored token exists", async () => {
    await loadPopupModule();

    expect(await screen.findByRole("heading", { name: "Sign in to Reading River" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("URL")).not.toBeInTheDocument();
  });

  it("renders an inline error when popup data loading fails", async () => {
    await loadPopupModule({
      getReject: new Error("storage unavailable"),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load Reading River.",
    );
  });

  it("renders the save form when a token exists", async () => {
    await loadPopupModule({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    expect(await screen.findByDisplayValue("https://example.com/article")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Saved from Firefox")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeRequired();
    expect(screen.getByRole("button", { name: "Save article" })).toBeDisabled();
  });

  it("keeps Save disabled when the URL is invalid even after a valid priority is entered", async () => {
    await loadPopupModule({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    fireEvent.change(screen.getByLabelText("URL"), {
      target: {
        value: "not-a-url",
      },
    });
    fireEvent.input(screen.getByLabelText("Priority"), {
      target: {
        value: "8",
      },
    });

    expect(screen.getByRole("button", { name: "Save article" })).toBeDisabled();
  });

  it("enables Save after a valid priority is entered when the URL is valid", async () => {
    await loadPopupModule({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    fireEvent.input(screen.getByLabelText("Priority"), {
      target: {
        value: "8",
      },
    });

    expect(screen.getByRole("button", { name: "Save article" })).toBeEnabled();
  });

  it("does not call login when the login form is invalid", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ token: "login-token" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchImpl);
    await loadPopupModule();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not call save when the edited URL is invalid", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "item-1", title: "Saved from Firefox" }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchImpl);
    await loadPopupModule({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    fireEvent.change(screen.getByLabelText("URL"), {
      target: {
        value: "not-a-url",
      },
    });
    fireEvent.input(screen.getByLabelText("Priority"), {
      target: {
        value: "8",
      },
    });

    fireEvent.submit(screen.getByLabelText("URL").closest("form") as HTMLFormElement);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not persist the login token if the active tab lookup fails after a successful login", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          token: "login-token",
          user: {
            id: "user-1",
            email: "reader@example.com",
            displayName: "River Reader",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchImpl);
    const { browser } = await loadPopupModule({
      queryReject: new Error("tabs unavailable"),
    });

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: {
        value: "reader@example.com",
      },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: {
        value: "secret",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign in. Try again.");
    expect(browser.set).not.toHaveBeenCalled();
  });

  it("submits login, stores the token, re-renders the save form, and sends the save payload", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/reading-river/api/extension/login")) {
        return new Response(
          JSON.stringify({
            token: "login-token",
            user: {
              id: "user-1",
              email: "reader@example.com",
              displayName: "River Reader",
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      if (url.endsWith("/reading-river/api/extension/save")) {
        expect(init?.headers).toEqual(
          expect.objectContaining({
            authorization: "Bearer login-token",
          }),
        );

        return new Response(JSON.stringify({ id: "item-1", title: "Saved from Firefox" }), {
          status: 201,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchImpl);
    const { browser } = await loadPopupModule();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: {
        value: "reader@example.com",
      },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: {
        value: "secret",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Save this page" })).toBeInTheDocument();
    expect(browser.set).toHaveBeenCalledWith({
      [storageKey]: "login-token",
    });

    const priorityInput = screen.getByLabelText("Priority");
    fireEvent.input(priorityInput, {
      target: {
        value: "8",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save article" }));

    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledWith(
        "https://petercurry.org/reading-river/api/extension/save",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            url: "https://example.com/article",
            title: "Saved from Firefox",
            priorityScore: 8,
          }),
        }),
      );
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Saved to Reading River.");
  });

  it("clears the token and returns to the signed-out form after an expired token response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchImpl);
    const { browser } = await loadPopupModule({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    fireEvent.input(screen.getByLabelText("Priority"), {
      target: {
        value: "7",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save article" }));

    expect(await screen.findByRole("heading", { name: "Sign in to Reading River" })).toBeInTheDocument();
    expect(browser.remove).toHaveBeenCalledWith(storageKey);
    expect(screen.queryByLabelText("Priority")).not.toBeInTheDocument();
  });

  it("preserves save form values and shows a retryable error on network failure", async () => {
    await loadPopupModule({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    fireEvent.change(screen.getByLabelText("URL"), {
      target: {
        value: "https://example.com/article",
      },
    });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: {
        value: "Saved from Firefox",
      },
    });
    fireEvent.change(screen.getByLabelText("Priority"), {
      target: {
        value: "6",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save article" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save right now. Try again.");
    expect(screen.getByLabelText("URL")).toHaveValue("https://example.com/article");
    expect(screen.getByLabelText("Title")).toHaveValue("Saved from Firefox");
    expect(screen.getByLabelText("Priority")).toHaveValue(6);
  });
});
