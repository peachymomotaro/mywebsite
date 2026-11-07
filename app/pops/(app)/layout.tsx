import type { ReactNode } from "react";
import { PopsNav } from "@/components/pops/PopsNav";
import { requireOwner } from "@/lib/pops/session";

export const dynamic = "force-dynamic";

export default async function PopsAppLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return (
    <>
      <a className="skip-link" href="#pops-main">Skip to content</a>
      <header className="pops-header">
        <PopsNav />
      </header>
      <main id="pops-main" className="pops-main">{children}</main>
    </>
  );
}
