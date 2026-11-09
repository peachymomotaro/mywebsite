"use client";

import { useActionState } from "react";
import { createCredentialAction, type CredentialState } from "@/app/pops/actions";
import { CopyButton } from "@/components/pops/CopyButton";

export function NewCredential({ scopes }: { scopes: readonly string[] }) {
  const [state, action, pending] = useActionState<CredentialState, FormData>(createCredentialAction, { token: null, error: null });
  return (
    <form action={action} aria-label="New agent credential">
      <div className="pops-inline">
        <input name="name" placeholder="Name, e.g. Agent connector" required maxLength={80} aria-label="Credential name" />
        <button type="submit" disabled={pending}>Create credential</button>
      </div>
      <details className="pops-more">
        <summary>Limit what it can do</summary>
        <div>
          {scopes.map((scope) => (
            <label key={scope} className="pops-check pops-check--inline pops-small">
              <input type="checkbox" name="scopes" value={scope} defaultChecked /> <code>{scope}</code>
            </label>
          ))}
        </div>
      </details>
      {state.error ? <p className="pops-error" role="alert">{state.error}</p> : null}
      {state.token ? (
        <div className="pops-notice" role="status">
          <p>Copy this token now. It is shown once and stored only as a hash.</p>
          <p><code style={{ wordBreak: "break-all" }}>{state.token}</code></p>
          <CopyButton text={state.token} label="Copy token" />
        </div>
      ) : null}
    </form>
  );
}
