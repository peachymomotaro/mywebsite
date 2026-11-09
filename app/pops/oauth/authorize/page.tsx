import Link from "next/link";
import { requireOwner } from "@/lib/pops/session";
import { OAuthError, validateAuthorizationRequest } from "@/lib/pops/oauth";
import { consentAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect to POps", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

const PERMISSIONS: Record<string, string> = {
  "tasks:read": "Read tasks, context, pipelines, and the playbook",
  "tasks:write": "Create tasks and edit their titles, descriptions, and tags",
  "runs:write": "Add results and suggested next steps to tasks",
  "decisions:write": "Ask you to make a decision",
  "feedback:write": "Record feedback you give in chat",
  "proposals:write": "Suggest pipeline and playbook changes for your review",
};

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  const query = params.toString();
  await requireOwner(`/pops/oauth/authorize?${query}`);
  let request;
  try { request = await validateAuthorizationRequest(params); } catch (error) {
    if (!(error instanceof OAuthError)) throw error;
    return <main className="pops-login"><h1>Connection unavailable</h1><p>{error.message}</p><Link href="/pops/connect">Back to connections</Link></main>;
  }
  return (
    <main className="pops-login">
      <h1>Connect to POps</h1>
      <p><strong>{request.client.name}</strong> is requesting access to your tasks.</p>
      <p className="pops-muted">Approve only if you just started this connection in ChatGPT or Claude. The client supplies its own name.</p>
      <p>Return address: <code style={{ overflowWrap: "anywhere" }}>{request.redirectUri}</code></p>
      <ul>{request.scopes.map((scope) => <li key={scope}>{PERMISSIONS[scope]}</li>)}</ul>
      <p className="pops-muted">You control task completion and approve playbook changes. You can revoke this connection at any time from Connect.</p>
      <form action={consentAction.bind(null, query)}>
        <button className="pops-button" name="consent" value="approve" type="submit">Allow connection</button>{" "}
        <button className="pops-button pops-button--secondary" name="consent" value="deny" type="submit">Cancel</button>
      </form>
    </main>
  );
}
