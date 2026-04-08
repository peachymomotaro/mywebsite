import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
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
  const get = vi.fn(async (key: string) => {
    if (getReject) {
      throw getReject;
    }

    return {
      [key]: key === storageKey ? token : undefined,
    };
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
      },
    },
    tabs: {
      query,
    },
  });

  return {
    get,
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
  createBrowserMock({ token, activeTab, getReject, queryReject });
  vi.resetModules();

  const popupModule = await import("@/extension/reading-river-firefox/popup");

  expect(popupModule.bootPopup).toEqual(expect.any(Function));

  return popupModule;
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

  it("requests only the activeTab permission in the manifest", () => {
    const manifest = JSON.parse(
      readFileSync(
        path.resolve(process.cwd(), "extension/reading-river-firefox/manifest.json"),
        "utf8",
      ),
    ) as {
      permissions?: string[];
    };

    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).not.toContain("tabs");
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

  it("enables the save button after a priority value is entered", async () => {
    await loadPopupModule({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    const priorityInput = await screen.findByLabelText("Priority");
    const saveButton = screen.getByRole("button", { name: "Save article" });

    expect(saveButton).toBeDisabled();

    fireEvent.input(priorityInput, {
      target: {
        value: "7",
      },
    });

    expect(saveButton).toBeEnabled();
  });

  it.each(["11", "-1", "1.5"])(
    "keeps save disabled for invalid priority value %s",
    async (value) => {
      await loadPopupModule({
        token: "stored-token",
        activeTab: {
          url: "https://example.com/article",
          title: "Saved from Firefox",
        },
      });

      const priorityInput = await screen.findByLabelText("Priority");
      const saveButton = screen.getByRole("button", { name: "Save article" });

      fireEvent.input(priorityInput, {
        target: {
          value,
        },
      });

      expect(saveButton).toBeDisabled();
    },
  );
});
