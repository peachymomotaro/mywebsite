import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootPopup } from "@/extension/reading-river-firefox/popup";

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

async function renderPopup({
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

  const root = document.getElementById("popup-root");

  if (!root) {
    throw new Error("Popup root was not created");
  }

  await bootPopup(root);

  return root;
}

describe("reading river firefox popup", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("renders the login form when no stored token exists", async () => {
    await renderPopup();

    expect(screen.getByRole("heading", { name: "Sign in to Reading River" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("URL")).not.toBeInTheDocument();
  });

  it("renders the save form when a token exists", async () => {
    await renderPopup({
      token: "stored-token",
      activeTab: {
        url: "https://example.com/article",
        title: "Saved from Firefox",
      },
    });

    expect(screen.getByDisplayValue("https://example.com/article")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Saved from Firefox")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeRequired();
    expect(screen.getByRole("button", { name: "Save article" })).toBeDisabled();
  });
});
