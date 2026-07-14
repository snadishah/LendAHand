import { useState } from "react";
import { apiPost } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Only show once we know the email is unverified.
  if (!user || user.emailVerified !== false) return null;

  async function resend() {
    setSending(true);
    try {
      await apiPost("/auth/resend-verification");
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-yellow/20 border-b border-yellow/40 text-sm px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
      <span>✉️ Please verify your email address to secure your account.</span>
      {sent ? (
        <span className="font-semibold text-green">Verification email sent — check your inbox.</span>
      ) : (
        <button onClick={resend} disabled={sending} className="font-semibold text-coral hover:underline">
          {sending ? "Sending…" : "Resend email"}
        </button>
      )}
    </div>
  );
}
