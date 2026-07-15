import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

const MARQUEE = ["Heavy Lifting", "Tutoring", "Cleaning", "Rides", "Deliveries", "Pet Care", "Painting", "Repairs"];

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
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-paper text-ink dark:bg-[#0B0B0B] dark:text-[#EDEBE4] md:grid md:grid-cols-[1.05fr_1fr]">
      {/* Left — bold ink panel */}
      <aside className="relative overflow-hidden bg-ink text-paper dark:bg-white dark:text-ink flex flex-col justify-between p-8 sm:p-12 min-h-[38vh] md:min-h-0 md:h-screen">
        <div className="absolute -right-16 -top-24 text-[26rem] leading-none opacity-[0.06] select-none pointer-events-none font-display">★</div>
        <div className="absolute right-10 bottom-40 h-40 w-40 rounded-full border border-paper/20 dark:border-ink/20" />

        <Link to="/" className="relative flex items-center gap-2 font-display font-bold text-xl">
          <span className="text-2xl">🤝</span> LendAHand
        </Link>

        <div className="relative">
          <p className="eyebrow !text-paper/50 dark:!text-ink/50">Welcome back</p>
          <h1 className="mt-4 font-display font-bold leading-[0.9] tracking-tightest text-[clamp(2.5rem,7vw,5.5rem)]">
            Get help.
            <br />
            Give <span className="italic">help.</span>
          </h1>
          <p className="mt-6 max-w-sm text-paper/70 dark:text-ink/70 text-lg">
            Pick up where you left off — your tasks, bids, and wallet are waiting.
          </p>
        </div>

        <div className="relative -mx-8 sm:-mx-12 overflow-hidden marquee-mask">
          <div className="flex w-max gap-3 animate-marquee px-3">
            {[...MARQUEE, ...MARQUEE].map((c, i) => (
              <span key={i} className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border border-paper/25 dark:border-ink/25 whitespace-nowrap">
                {c}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Right — form */}
      <main className="flex items-center justify-center px-6 py-14 md:h-screen md:overflow-y-auto">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <Link to="/" className="md:hidden mb-8 flex items-center gap-2 font-display font-bold text-lg">
            <span className="text-2xl">🤝</span> LendAHand
          </Link>

          <p className="eyebrow">Log in</p>
          <h2 className="mt-3 font-display font-bold text-[clamp(2rem,5vw,3rem)] leading-none tracking-tightest">
            Welcome back.
          </h2>
          <p className="text-muted mt-3">Enter your details to continue.</p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Email</label>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold hover:underline underline-offset-4">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-7 !py-3 text-base">
            {submitting ? "Logging in…" : "Log In →"}
          </button>

          <div className="mt-8 pt-6 border-t border-ink/10 dark:border-white/10 text-center text-sm text-muted">
            New to LendAHand?{" "}
            <Link to="/register" className="font-semibold text-ink dark:text-white hover:underline underline-offset-4">
              Create an account
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
