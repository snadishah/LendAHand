import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
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
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

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
          Money for active tasks is held safely in escrow and released to your helper once the work is confirmed.
        </p>
      </section>

      {/* Coming-soon note */}
      <div className="card p-5 flex items-start gap-3">
        <span className="text-xl">🏦</span>
        <div>
          <p className="font-display font-semibold">Deposits &amp; withdrawals — coming soon</p>
          <p className="text-sm text-muted mt-0.5">
            Real top-ups and cash-outs will arrive once payments are integrated. For now, your balance moves
            automatically as you post, hire, and complete tasks.
          </p>
        </div>
      </div>

      {/* History */}
      <div className="card p-6">
        <p className="font-display font-semibold text-lg mb-4">Transaction history</p>
        {loading ? (
          <Spinner />
        ) : transactions.length === 0 ? (
          <EmptyState emoji="💳" title="No transactions yet" />
        ) : (
          <ul className="divide-y divide-ink/8 dark:divide-white/10 -my-2">
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
  );
}
