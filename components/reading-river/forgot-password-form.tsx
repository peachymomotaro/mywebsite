import { AuthActions } from "@/components/reading-river/auth-actions";
import { AuthField } from "@/components/reading-river/auth-field";

type ForgotPasswordFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  return (
    <details className="forgot-password">
      <summary className="auth-text-button">
        Forgot password?
      </summary>

      <form action={action} className="editorial-form auth-form forgot-password-form">
        <AuthField label="Reset email address">
          <input
            autoComplete="email"
            className="intake-input auth-input"
            name="email"
            required
            type="email"
          />
        </AuthField>
        <AuthActions>
          <button className="river-primary-action auth-action-full" type="submit">
            Send reset link
          </button>
        </AuthActions>
      </form>
    </details>
  );
}
