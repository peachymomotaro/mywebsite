"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type AddItemTabsProps = {
  articleContent: ReactNode;
  manualContent: ReactNode;
};

export function AddItemTabs({ articleContent, manualContent }: AddItemTabsProps) {
  const [selectedTab, setSelectedTab] = useState<"link" | "manual">("link");

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
            aria-pressed={selectedTab === "manual"}
            className={
              selectedTab === "manual"
                ? "river-primary-action add-mode-button add-mode-button-active"
                : "river-primary-action river-primary-action-muted add-mode-button"
            }
            onClick={() => setSelectedTab("manual")}
          >
            Manual item
          </button>
        </div>
      </div>

      <div className="add-mode-panel">
        {selectedTab === "link" ? articleContent : manualContent}
      </div>
    </div>
  );
}
