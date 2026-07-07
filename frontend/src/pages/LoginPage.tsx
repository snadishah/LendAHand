import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="relative overflow-hidden md:w-1/2 bg-navy text-white flex flex-col justify-center px-10 py-16 gap-8">
        <div className="absolute -top-10 -left-10 text-6xl opacity-10 select-none">✦</div>
        <div className="absolute top-1/3 right-10 text-5xl opacity-10 select-none">●</div>
        <div className="absolute bottom-10 left-1/4 text-6xl opacity-10 select-none">◆</div>

        <div className="flex items-center gap-3 text-3xl font-extrabold">
          <span>🤝</span> LendAHand
        </div>
        <p className="text-lg text-slate-300 max-w-sm">
          The friendly student marketplace where you post tasks, bid to help, and get paid securely — every time.
        </p>

        <ul className="space-y-4 max-w-sm">
          <Feature icon="💰" title="Earn Real Rupees" text="Bid on tasks and get paid straight into your in-app wallet." />
          <Feature icon="✨" title="AI Price Estimator" text="Gemini-powered pricing suggestions when you post a task." />
          <Feature icon="🗺️" title="Live Task Map" text="See open tasks near you and sort by distance." />
        </ul>
      </div>

      <div className="md:w-1/2 flex items-center justify-center px-6 py-16 bg-white dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold">Welcome back 👋</h1>
            <p className="text-muted text-sm mt-1">Log in to continue to your dashboard.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold mb-1 block">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Logging in..." : "Log In"}
          </button>

          <p className="text-sm text-center text-muted">
            New here?{" "}
            <Link to="/register" className="text-coral font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-slate-400">{text}</p>
      </div>
    </li>
  );
}
