import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageKey = "reading-river-extension-token";

function createBrowserMock() {
  vi.stubGlobal("browser", {
    storage: {
      local: {
        get: vi.fn(async () => ({
          [storageKey]: "stored-token",
        })),
        set: vi.fn(),
        remove: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(async () => [
        {
          id: 7,
          url: "https://example.com/article",
          title: "Saved from Chrome",
        },
      ]),
    },
    scripting: {
      executeScript: vi.fn(async () => [
        {
          result: "",
        },
      ]),
    },
  });
}

async function loadChromePopup() {
  document.body.innerHTML = '<main id="popup-root"></main>';
  createBrowserMock();
  vi.resetModules();

  const popupModule = await import("@/extension/reading-river-chrome/popup");

  expect(popupModule.bootPopup).toEqual(expect.any(Function));
}

describe("reading river chrome popup", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("constrains page detail fields to the extension API limits", async () => {
    await loadChromePopup();

    expect(await screen.findByLabelText("URL")).toHaveAttribute("maxlength", "2048");
    expect(screen.getByLabelText("Title")).toHaveAttribute("maxlength", "300");
    expect(screen.queryByRole("option", { name: "0" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "10" })).toBeInTheDocument();
  });

  it("shows a specific validation message when the extension API rejects the payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    await loadChromePopup();

    fireEvent.change(await screen.findByRole("combobox", { name: "Priority" }), {
      target: {
        value: "none",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save article" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some page details are too long or invalid. Check the URL, title, and estimated minutes.",
    );
  });
});
