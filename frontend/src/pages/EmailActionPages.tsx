import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPost, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[#F7F6F2] dark:bg-[#0B0B0B]">
      <div className="w-full max-w-md card p-8 space-y-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
          <span className="text-2xl">🤝</span> LendAHand
        </Link>
        {children}
      </div>
    </div>
  );
}

const errBox = "rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3";
const okBox = "rounded-xl bg-green/10 text-green text-sm px-4 py-3";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    apiPost("/auth/verify-email", { token })
      .then(async () => {
        setState("ok");
        if (user) await refreshUser();
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Couldn't verify your email.");
      });
  }, [token, user, refreshUser]);

  return (
    <CenteredCard>
      <h1 className="text-xl font-extrabold">Email verification</h1>
      {state === "loading" && <p className="text-muted text-sm">Verifying your email…</p>}
      {state === "ok" && (
        <>
          <div className={okBox}>✅ Your email is verified. Thanks!</div>
          <Link to={user ? "/dashboard" : "/login"} className="btn-primary w-full text-center">
            Continue
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <div className={errBox}>{message}</div>
          <Link to={user ? "/dashboard" : "/login"} className="btn-secondary w-full text-center">
            Go back
          </Link>
        </>
      )}
    </CenteredCard>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost("/auth/forgot-password", { email });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredCard>
      <h1 className="text-xl font-extrabold">Forgot your password?</h1>
      {sent ? (
        <>
          <div className={okBox}>
            If an account exists for that email, we've sent a reset link. Check your inbox (and spam).
          </div>
          <Link to="/login" className="btn-secondary w-full text-center">
            Back to login
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-muted">Enter your email and we'll send you a link to reset your password.</p>
          <input
            type="email"
            required
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Sending…" : "Send reset link"}
          </button>
          <Link to="/login" className="block text-center text-sm text-ink dark:text-white font-semibold hover:underline">
            Back to login
          </Link>
        </form>
      )}
    </CenteredCard>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    if (!token) return setError("This reset link is missing its token.");

    setSubmitting(true);
    try {
      await apiPost("/auth/reset-password", { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredCard>
      <h1 className="text-xl font-extrabold">Reset your password</h1>
      {done ? (
        <>
          <div className={okBox}>✅ Your password has been reset. You can now log in.</div>
          <Link to="/login" className="btn-primary w-full text-center">
            Go to login
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className={errBox}>{error}</div>}
          <input
            type="password"
            required
            className="input-field"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            required
            className="input-field"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </CenteredCard>
  );
}

export function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState("error");
      return;
    }
    apiPost("/users/unsubscribe", { token })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <CenteredCard>
      <h1 className="text-xl font-extrabold">Email preferences</h1>
      {state === "loading" && <p className="text-muted text-sm">Updating your preferences…</p>}
      {state === "ok" && (
        <div className={okBox}>
          ✅ You've been unsubscribed from non-essential emails. You'll still get important account and task
          notifications. You can re-enable these anytime in Settings.
        </div>
      )}
      {state === "error" && <div className={errBox}>This unsubscribe link is invalid or has expired.</div>}
    </CenteredCard>
  );
}
