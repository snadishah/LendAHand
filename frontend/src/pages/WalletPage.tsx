import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPost, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { WalletTransaction, WalletTxType } from "../types";
import { Spinner, EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

const TX_LABEL: Record<WalletTxType, { label: string; icon: string; sign: "+" | "-" }> = {
  DEPOSIT: { label: "Deposit", icon: "⬆️", sign: "+" },
  WITHDRAW: { label: "Withdrawal", icon: "⬇️", sign: "-" },
  ESCROW_HOLD: { label: "Held in escrow", icon: "🔒", sign: "-" },
  ESCROW_RELEASE: { label: "Payment received", icon: "💵", sign: "+" },
  REFUND: { label: "Refund", icon: "↩️", sign: "+" },
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
    <div className="space-y-5 max-w-3xl">
      <PageHeader icon="💰" title="My Wallet" subtitle="Deposit, withdraw, and track your transactions." />

      <div className="rounded-card bg-gradient-to-r from-coral to-orange text-white p-6 shadow-card-lg">
        <p className="text-white/80 text-sm">Current Balance</p>
        <p className="text-4xl font-extrabold mt-1">Rs. {(balance ?? user?.walletBalance ?? 0).toFixed(0)}</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div className="flex gap-1 bg-[#F7F6F2] dark:bg-[#0B0B0B] rounded-full p-1 w-fit">
          <button type="button" onClick={() => setTab("deposit")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "deposit" ? "bg-white dark:bg-[#242424] shadow-card text-green" : "text-muted"}`}>
            Deposit
          </button>
          <button type="button" onClick={() => setTab("withdraw")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "withdraw" ? "bg-white dark:bg-[#242424] shadow-card text-ink dark:text-white" : "text-muted"}`}>
            Withdraw
          </button>
        </div>

        {error && <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">{error}</div>}

        <div className="flex gap-2">
          <input type="number" min="1" required className="input-field" placeholder="Amount (Rs.)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button type="submit" disabled={submitting} className={tab === "deposit" ? "btn-primary shrink-0" : "btn-secondary shrink-0"}>
            {submitting ? "Processing..." : tab === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        </div>
      </form>

      <div className="card p-5">
        <p className="font-bold mb-3">Transaction History</p>
        {loading ? (
          <Spinner />
        ) : transactions.length === 0 ? (
          <EmptyState emoji="💳" title="No transactions yet" />
        ) : (
          <ul className="divide-y divide-[#E8E8E8] dark:divide-white/10">
            {transactions.map((tx) => {
              const meta = TX_LABEL[tx.type];
              return (
                <li key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium">{meta.label}</p>
                      <p className="text-xs text-muted truncate">{tx.note}</p>
                    </div>
                  </div>
                  <span className={`font-bold shrink-0 ${meta.sign === "+" ? "text-green" : "text-ink dark:text-white"}`}>
                    {meta.sign} Rs. {tx.amount.toFixed(0)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
