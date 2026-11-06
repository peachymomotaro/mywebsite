import { revokeCredentialAction } from "@/app/pops/actions";
import { NewCredential } from "@/components/pops/NewCredential";
import { siteBaseUrl } from "@/lib/pops/agent-ops";
import { AGENT_SCOPES } from "@/lib/pops/constants";
import { getPopsDb } from "@/lib/pops/db";
import { ago, formatDate } from "@/lib/pops/format";

export const metadata = { title: "Connect" };

export default async function ConnectPage() {
  const credentials = await getPopsDb().popsAgentCredential.findMany({ orderBy: { createdAt: "desc" } });
  const base = siteBaseUrl();
  const now = new Date();

  return (
    <>
      <h1>Connect</h1>
      <p className="pops-lede">
        How ChatGPT and other agents read tasks and write results back. Every route below is private: it needs an agent credential, and
        agents can never change a task&rsquo;s status, edit the playbook or edit pipelines directly.
      </p>

      <h2>Ways to connect</h2>
      <ol>
        <li>
          <strong>Copy and paste (always works).</strong> Choose a pipeline on a task, copy the prompt into any ChatGPT conversation, then
          paste ChatGPT&rsquo;s <code>pops-report</code> block into the task page. No credential needed.
        </li>
        <li>
          <strong>Custom GPT action.</strong> Create a GPT, add an action, import the schema from <code>{base}/api/pops/v1/openapi.json</code>,
          and set authentication to API key → Bearer with a credential from below. The GPT can then create tasks, read context and record runs.
        </li>
        <li>
          <strong>MCP connector.</strong> Server URL <code>{base}/api/pops/mcp</code> (Streamable HTTP, bearer token). Works with MCP clients
          that accept a bearer token. ChatGPT&rsquo;s developer-mode connectors currently expect OAuth, which POps V1 does not implement — see
          the README for the upgrade path.
        </li>
      </ol>

      <h2>REST endpoints</h2>
      <table className="pops-library pops-small">
        <tbody>
          {[
            ["GET", "/api/pops/v1/tasks", "List tasks (?workspace, ?status, ?tag)"],
            ["POST", "/api/pops/v1/tasks", "Create a task (idempotencyKey optional)"],
            ["GET", "/api/pops/v1/tasks/{id}", "Task context: runs, decisions, notes, pipelines"],
            ["GET", "/api/pops/v1/tasks/{id}/prompt?pipeline=slug", "Full pipeline prompt"],
            ["POST", "/api/pops/v1/tasks/{id}/runs", "Record an agent run (idempotent)"],
            ["POST", "/api/pops/v1/tasks/{id}/decisions", "Ask for a decision"],
            ["POST", "/api/pops/v1/runs/{id}/feedback", "Relay Peter's feedback"],
            ["POST", "/api/pops/v1/proposals", "Propose a pipeline/playbook change"],
            ["GET", "/api/pops/v1/pipelines", "Pipeline templates"],
            ["GET", "/api/pops/v1/playbook", "Current playbook"],
          ].map(([method, path, note]) => (
            <tr key={method + path}>
              <td className="pops-meta">{method}</td>
              <td><code>{path}</code></td>
              <td className="pops-muted">{note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Agent credentials</h2>
      <NewCredential scopes={AGENT_SCOPES} />
      {credentials.length ? (
        <table className="pops-library pops-small" style={{ marginTop: 16 }}>
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
    </>
  );
}
