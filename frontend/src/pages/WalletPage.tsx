import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPost, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { WalletTransaction, WalletTxType } from "../types";
import { Spinner, EmptyState } from "../components/ui/EmptyState";

const TX_LABEL: Record<WalletTxType, { label: string; icon: string; sign: "+" | "-" }> = {
  DEPOSIT: { label: "Deposit", icon: "↑", sign: "+" },
  WITHDRAW: { label: "Withdrawal", icon: "↓", sign: "-" },
  ESCROW_HOLD: { label: "Held in escrow", icon: "◇", sign: "-" },
  ESCROW_RELEASE: { label: "Payment received", icon: "✓", sign: "+" },
  REFUND: { label: "Refund", icon: "↩", sign: "+" },
};

export function WalletPage() {
  const { user, refreshUser } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const summary = await apiGet<{ balance: number; transactions: WalletTransaction[] }>("/wallet");
    setBalance(summary.balance);
    setTransactions(summary.transactions);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    setSubmitting(true);
    try {
      await apiPost(`/wallet/${tab}`, { amount: amt });
      await Promise.all([load(), refreshUser()]);
      setAmount("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Balance statement */}
      <section className="relative overflow-hidden rounded-card bg-ink text-paper dark:bg-white dark:text-ink p-7 sm:p-10">
        <div className="absolute -right-8 -bottom-16 text-[14rem] leading-none opacity-[0.06] select-none pointer-events-none font-display">₨</div>
        <p className="eyebrow !text-paper/50 dark:!text-ink/50">Total balance</p>
        <p className="mt-3 font-display font-bold tracking-tightest leading-none text-[clamp(3rem,12vw,6rem)]">
          Rs. {(balance ?? user?.walletBalance ?? 0).toFixed(0)}
        </p>
        <p className="mt-4 text-paper/60 dark:text-ink/60 text-sm max-w-md">
          Add funds to hire helpers, and cash out what you earn. Money in active tasks is held safely in escrow.
        </p>
      </section>

      <div className="grid md:grid-cols-[1fr_1.4fr] gap-6">
        {/* Deposit / Withdraw */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4 h-fit">
          <div className="inline-flex w-full rounded-full border border-ink/12 dark:border-white/15 p-1">
            {(["deposit", "withdraw"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t ? "bg-ink text-paper dark:bg-white dark:text-ink" : "text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold mb-1.5 block">Amount (Rs.)</label>
            <input type="number" min="1" required className="input-field text-lg" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full !py-3">
            {submitting ? "Processing…" : tab === "deposit" ? "Add Funds" : "Withdraw"}
          </button>
        </form>

        {/* History */}
        <div className="card p-6">
          <p className="font-display font-semibold text-lg mb-4">Transaction history</p>
          {loading ? (
            <Spinner />
          ) : transactions.length === 0 ? (
            <EmptyState emoji="💳" title="No transactions yet" />
          ) : (
            <ul className="divide-y divide-ink/8 dark:divide-white/10 -my-2 max-h-[420px] overflow-y-auto">
              {transactions.map((tx) => {
                const meta = TX_LABEL[tx.type];
                const positive = meta.sign === "+";
                return (
                  <li key={tx.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-bold ${positive ? "bg-ink text-paper dark:bg-white dark:text-ink" : "border border-ink/20 dark:border-white/20"}`}>
                        {meta.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{meta.label}</p>
                        <p className="text-xs text-muted truncate">{tx.note}</p>
                      </div>
                    </div>
                    <span className="font-display font-bold tabular-nums shrink-0">
                      {meta.sign} Rs. {tx.amount.toFixed(0)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
