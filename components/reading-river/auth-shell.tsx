import type { ReactNode } from "react";
import { cn } from "@/lib/reading-river/utils";

type AuthShellProps = {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  feedback?: ReactNode;
  children?: ReactNode;
  frameClassName?: string;
  sectionClassName?: string;
};

export function AuthShell({
  title,
  eyebrow = "Reading River",
  description,
  feedback,
  children,
  frameClassName,
  sectionClassName,
}: AuthShellProps) {
  return (
    <main className="auth-page">
      <div className={cn("auth-page-frame mx-auto w-full", frameClassName)}>
        <section
          data-slot="auth-shell"
          className={cn("editorial-panel auth-shell w-full", sectionClassName)}
        >
          <div className="auth-shell-body">
            <div className="auth-shell-copy">
              <p className="auth-eyebrow">{eyebrow}</p>
              <h1 className="auth-title">{title}</h1>
              {description}
            </div>
            {feedback ? (
              <div data-slot="auth-feedback" className="auth-feedback">
                {feedback}
              </div>
            ) : null}
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
