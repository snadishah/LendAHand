import { useState, type FormEvent } from "react";
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
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="relative overflow-hidden md:w-1/2 bg-teal text-white flex flex-col justify-center px-10 py-16 gap-8">
        <div className="absolute -top-10 -right-10 text-6xl opacity-10 select-none">✦</div>
        <div className="absolute top-1/3 left-10 text-5xl opacity-10 select-none">●</div>
        <div className="absolute bottom-10 right-1/4 text-6xl opacity-10 select-none">◆</div>

        <div className="flex items-center gap-3 text-3xl font-extrabold">
          <span>🤝</span> LendAHand
        </div>
        <p className="text-lg text-white/90 max-w-sm">Choose how you want to use LendAHand — you can always help both ways.</p>

        <div className="space-y-4 max-w-sm">
          <RoleCard icon="🧑‍💼" title="Post Tasks" text="Need something done? Post a task and pick the best bid." bonus="Start with Rs. 200" />
          <RoleCard icon="🦺" title="Help & Earn" text="Browse open tasks nearby, bid, and get paid when you're done." bonus="Start with Rs. 50" />
        </div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center px-6 py-16 bg-white dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold">Create your account ✨</h1>
            <p className="text-muted text-sm mt-1">Join the LendAHand community.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <RoleRadio
              icon="🧑‍💼"
              label="Post Tasks"
              selected={userType === "POSTER"}
              onClick={() => setUserType("POSTER")}
            />
            <RoleRadio
              icon="🦺"
              label="Help & Earn"
              selected={userType === "HELPER"}
              onClick={() => setUserType("HELPER")}
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Full name</label>
            <input required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Email</label>
            <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">City (optional)</label>
            <input className="input-field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold mb-1 block">Password</label>
              <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Confirm</label>
              <input type="password" required className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-sm text-center text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-coral font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, text, bonus }: { icon: string; title: string; text: string; bonus: string }) {
  return (
    <div className="flex gap-3 bg-white/10 rounded-2xl p-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold">
          {title} <span className="ml-1 text-xs bg-yellow text-navy font-bold rounded-full px-2 py-0.5">{bonus}</span>
        </p>
        <p className="text-sm text-white/80">{text}</p>
      </div>
    </div>
  );
}

function RoleRadio({ icon, label, selected, onClick }: { icon: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold flex flex-col items-center gap-1 transition-colors ${
        selected ? "border-coral bg-coral/5 text-coral" : "border-[#E2E8F0] dark:border-slate-600 text-muted"
      }`}
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  );
}
