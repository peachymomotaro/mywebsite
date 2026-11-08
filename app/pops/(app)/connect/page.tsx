import { revokeCredentialAction } from "@/app/pops/actions";
import { NewCredential } from "@/components/pops/NewCredential";
import { siteBaseUrl } from "@/lib/pops/agent-ops";
import { AGENT_SCOPES } from "@/lib/pops/constants";
import { getPopsDb } from "@/lib/pops/db";
import { ago, formatDate } from "@/lib/pops/format";

export const metadata = { title: "Connect" };

const ENDPOINTS = [
  ["GET", "/api/pops/v1/tasks", "List tasks (?workspace, ?status, ?tag)"],
  ["POST", "/api/pops/v1/tasks", "Create a task (idempotencyKey optional)"],
  ["GET", "/api/pops/v1/tasks/{id}", "Task context: runs, decisions, notes, pipelines"],
  ["PATCH", "/api/pops/v1/tasks/{id}", "Edit title, description, or tags (read task.updatedAt first)"],
  ["GET", "/api/pops/v1/tasks/{id}/prompt?pipeline=slug", "Full pipeline prompt"],
  ["POST", "/api/pops/v1/tasks/{id}/runs", "Record an agent run (idempotent)"],
  ["POST", "/api/pops/v1/tasks/{id}/decisions", "Ask for a decision"],
  ["POST", "/api/pops/v1/runs/{id}/feedback", "Relay your feedback"],
  ["POST", "/api/pops/v1/proposals", "Suggest a pipeline or playbook change"],
  ["GET", "/api/pops/v1/pipelines", "Pipeline templates"],
  ["GET", "/api/pops/v1/playbook", "Current playbook"],
];

export default async function ConnectPage() {
  const credentials = await getPopsDb().popsAgentCredential.findMany({ orderBy: { createdAt: "desc" } });
  const base = siteBaseUrl();
  const now = new Date();

  return (
    <>
      <h1>Connect</h1>
      <p className="pops-lede">Connect ChatGPT and Claude to create tasks and write results back from chat. You control task completion and playbook changes.</p>

      <h2>Ways to connect</h2>
      <ol className="pops-list" style={{ borderTop: "var(--pops-rule)" }}>
        <li>
          <strong>ChatGPT and Claude via MCP.</strong>{" "}
          <span className="pops-muted">Add a custom MCP connector using <code>{base}/api/pops/mcp</code>, choose OAuth with automatic client registration, then sign in to POps and allow the connection. No API key is needed.</span>
          <p className="pops-muted">In ChatGPT, add a custom MCP server from Plugins. In Claude, use Customize &rarr; Connectors &rarr; Add custom connector and choose &ldquo;Register automatically&rdquo;. Enable POps in your conversation.</p>
          <p className="pops-muted">Try: &ldquo;Create a task in my Writing workspace to research my next essay.&rdquo; You can also ask either app to edit a task&rsquo;s title, description, or tags, or add results. Each connection appears below and can be revoked separately.</p>
        </li>
        <li>
          <strong>Custom GPT action.</strong>{" "}
          <span className="pops-muted">
            Import <code>{base}/api/pops/v1/openapi.json</code> as an action, choosing API key, then Bearer, using a credential below.
          </span>
        </li>
        <li>
          <strong>Copy and paste.</strong>{" "}
          <span className="pops-muted">
            Copy a pipeline prompt into either chat app, then paste its report back on the task. No setup.
          </span>
        </li>
      </ol>

      <h2>Agent credentials</h2>
      <p className="pops-muted">OAuth connections appear here after you connect. Create a bearer credential below for scripts, Claude Code, Codex, or Custom GPT actions.</p>
      <NewCredential scopes={AGENT_SCOPES} />
      {credentials.length ? (
        <table className="pops-table" style={{ marginTop: 16 }}>
          <thead>
            <tr><th scope="col">Name</th><th scope="col">Token</th><th scope="col">Scopes</th><th scope="col">Used</th><th scope="col" /></tr>
          </thead>
          <tbody>
            {credentials.map((c) => (
              <tr key={c.id}>
                <td>{c.name}<div className="pops-meta">created {formatDate(c.createdAt)}</div></td>
                <td><code>{c.tokenPrefix}…</code></td>
                <td className="pops-meta">{c.scopes.join(" ")}</td>
                <td className="pops-meta">{c.lastUsedAt ? ago(c.lastUsedAt, now) : "never"}</td>
                <td>
                  {c.revokedAt ? (
                    <span className="pops-meta">revoked {formatDate(c.revokedAt)}</span>
                  ) : (
                    <form action={revokeCredentialAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="pops-link-button">Revoke</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <details className="pops-more" style={{ marginTop: 32 }}>
        <summary>API reference</summary>
        <table className="pops-table">
          <tbody>
            {ENDPOINTS.map(([method, path, note]) => (
              <tr key={method + path}>
                <td className="pops-mono">{method}</td>
                <td><code>{path}</code></td>
                <td className="pops-muted">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
