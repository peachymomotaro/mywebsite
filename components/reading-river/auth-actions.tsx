import type { ReactNode } from "react";
import { cn } from "@/lib/reading-river/utils";

type AuthActionsProps = {
  children: ReactNode;
  className?: string;
};

export function AuthActions({ children, className }: AuthActionsProps) {
  return (
    <div data-slot="auth-actions" className={cn("auth-actions", className)}>
      {children}
    </div>
  );
}
