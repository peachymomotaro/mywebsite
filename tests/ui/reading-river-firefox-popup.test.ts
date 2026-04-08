import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageKey = "reading-river-extension-token";

function createBrowserMock({
  token,
  activeTab,
}: {
  token: string | null;
  activeTab: {
    url: string;
    title: string;
  };
}) {
  const get = vi.fn(async (key: string) => ({
    [key]: key === storageKey ? token : undefined,
  }));
  const query = vi.fn(async () => [activeTab]);

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
}: Partial<{
  token: string | null;
  activeTab: {
    url: string;
    title: string;
  };
}> = {}) {
  document.body.innerHTML = '<main id="popup-root"></main>';
  createBrowserMock({ token, activeTab });
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

  it("renders the login form when no stored token exists", async () => {
    await loadPopupModule();

    expect(await screen.findByRole("heading", { name: "Sign in to Reading River" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("URL")).not.toBeInTheDocument();
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
});
