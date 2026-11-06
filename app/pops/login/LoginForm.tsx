"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });
  return (
    <form action={action} className="pops-login-form">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="pops-password">Password</label>
      <div className="pops-inline">
        <input id="pops-password" name="password" type="password" autoComplete="current-password" required autoFocus />
        <button type="submit" disabled={pending}>{pending ? "Checking…" : "Enter"}</button>
      </div>
      {state.error ? <p role="alert" className="pops-error">{state.error}</p> : null}
    </form>
  );
}
