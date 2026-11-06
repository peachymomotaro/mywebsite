import { LoginForm } from "./LoginForm";
import { safeNextPath } from "@/lib/pops/paths";

export default async function PopsLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="pops-login">
      <h1>POps</h1>
      <p className="pops-muted">Private. Owner access only.</p>
      <LoginForm next={safeNextPath(next)} />
    </main>
  );
}
