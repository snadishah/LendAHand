import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import type { UserType } from "../types";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [city, setCity] = useState("");
  const [userType, setUserType] = useState<UserType>("POSTER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 3) return setError("Name must be at least 3 characters.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    setSubmitting(true);
    try {
      await register({ name, email, password, userType, city: city || undefined });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-[#0B0B0B] dark:text-[#EDEBE4] md:grid md:grid-cols-[1fr_1.05fr]">
      {/* Left — form */}
      <main className="order-2 md:order-1 flex items-center justify-center px-6 py-14">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <Link to="/" className="md:hidden mb-8 flex items-center gap-2 font-display font-bold text-lg">
            <span className="text-2xl">🤝</span> LendAHand
          </Link>

          <p className="eyebrow">Create account</p>
          <h2 className="mt-3 font-display font-bold text-[clamp(2rem,5vw,3rem)] leading-none tracking-tightest">
            Join in.
          </h2>
          <p className="text-muted mt-3">How do you want to use LendAHand?</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <RolePick icon="🧑‍💼" label="Post Tasks" bonus="Rs. 200 to start" selected={userType === "POSTER"} onClick={() => setUserType("POSTER")} />
            <RolePick icon="🦺" label="Help & Earn" bonus="Rs. 50 to start" selected={userType === "HELPER"} onClick={() => setUserType("HELPER")} />
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <Field label="Full name">
              <input required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
            </Field>
            <Field label="Email">
              <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="City (optional)">
              <input className="input-field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Password">
                <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Confirm">
                <input type="password" required className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-7 !py-3 text-base">
            {submitting ? "Creating account…" : "Create Account →"}
          </button>

          <div className="mt-8 pt-6 border-t border-ink/10 dark:border-white/10 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-ink dark:text-white hover:underline underline-offset-4">
              Log in
            </Link>
          </div>
        </form>
      </main>

      {/* Right — bold ink panel */}
      <aside className="order-1 md:order-2 relative overflow-hidden bg-ink text-paper dark:bg-white dark:text-ink flex flex-col justify-between p-8 sm:p-12 min-h-[30vh] md:min-h-screen">
        <div className="absolute -left-20 -bottom-28 text-[26rem] leading-none opacity-[0.06] select-none pointer-events-none font-display">✦</div>

        <Link to="/" className="relative self-end flex items-center gap-2 font-display font-bold text-xl">
          <span className="text-2xl">🤝</span> LendAHand
        </Link>

        <div className="relative">
          <h1 className="font-display font-bold leading-[0.9] tracking-tightest text-[clamp(2.5rem,6vw,5rem)]">
            The whole
            <br />
            neighbourhood,
            <br />
            <span className="italic">one tap away.</span>
          </h1>
          <div className="mt-8 space-y-4 max-w-sm">
            <Perk n="01" t="Post a task or bid to help" d="Two ways to use it — switch whenever you like." />
            <Perk n="02" t="Escrow on every job" d="Money is safe until the work is confirmed done." />
            <Perk n="03" t="Get paid to your wallet" d="Cash out your earnings whenever you want." />
          </div>
        </div>

        <div className="relative text-sm text-paper/50 dark:text-ink/50">Get help. Give help.</div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function RolePick({ icon, label, bonus, selected, onClick }: { icon: string; label: string; bonus: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-card border p-4 text-left transition-all ${
        selected
          ? "border-ink dark:border-white bg-ink text-paper dark:bg-white dark:text-ink shadow-hard dark:shadow-none"
          : "border-ink/20 dark:border-white/20 hover:border-ink dark:hover:border-white"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <p className="mt-2 font-display font-semibold">{label}</p>
      <p className={`text-xs mt-0.5 ${selected ? "text-paper/70 dark:text-ink/70" : "text-muted"}`}>{bonus}</p>
    </button>
  );
}

function Perk({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono text-sm opacity-50 pt-0.5">{n}</span>
      <div>
        <p className="font-semibold">{t}</p>
        <p className="text-sm text-paper/60 dark:text-ink/60">{d}</p>
      </div>
    </div>
  );
}
