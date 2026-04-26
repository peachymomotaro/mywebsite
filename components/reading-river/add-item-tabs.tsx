"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type AddItemTabsProps = {
  articleContent: ReactNode;
  bookContent: ReactNode;
};

export function AddItemTabs({ articleContent, bookContent }: AddItemTabsProps) {
  const [selectedTab, setSelectedTab] = useState<"link" | "book">("link");

  return (
    <div className="space-y-8">
      <div className="add-mode-switch">
        <div className="add-mode-switch-track" role="group" aria-label="Choose intake mode">
          <button
            type="button"
            aria-pressed={selectedTab === "link"}
            className={
              selectedTab === "link"
                ? "river-primary-action add-mode-button add-mode-button-active"
                : "river-primary-action river-primary-action-muted add-mode-button"
            }
            onClick={() => setSelectedTab("link")}
          >
            Paste a link
          </button>
          <button
            type="button"
            aria-pressed={selectedTab === "book"}
            className={
              selectedTab === "book"
                ? "river-primary-action add-mode-button add-mode-button-active"
                : "river-primary-action river-primary-action-muted add-mode-button"
            }
            onClick={() => setSelectedTab("book")}
          >
            Add a book
          </button>
        </div>
      </div>

      <div className="add-mode-panel">
        {selectedTab === "link" ? articleContent : bookContent}
      </div>
    </div>
  );
}
