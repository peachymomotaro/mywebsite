import type { ReactNode } from "react";
import { cn } from "@/lib/reading-river/utils";

type AuthFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function AuthField({ label, children, className }: AuthFieldProps) {
  return (
    <label data-slot="auth-field" className={cn("auth-field", className)}>
      <span className="auth-field-label">{label}</span>
      {children}
    </label>
  );
}
