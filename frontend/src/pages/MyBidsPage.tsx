import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPatch, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Bid, Task } from "../types";
import { StatusChip } from "../components/ui/StatusChip";
import { BidCard } from "../components/tasks/BidCard";
import { EmptyState, Spinner } from "../components/ui/EmptyState";
import { Avatar } from "../components/ui/Avatar";
import { PageHeader } from "../components/ui/PageHeader";

export function MyBidsPage() {
  const { user, refreshUser } = useAuth();

  if (user?.userType === "HELPER") return <HelperBidsView />;
  return <PosterBidsView refreshUser={refreshUser} />;
}

function HelperBidsView() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ bids: Bid[] }>("/bids/mine")
      .then(({ bids }) => setBids(bids))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader icon="📝" title="My Bids" subtitle="Track the bids you've placed and their status." />
      {loading ? (
        <Spinner />
      ) : bids.length === 0 ? (
        <EmptyState emoji="📝" title="No bids yet" subtitle="Browse open tasks and place your first bid." />
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => (
            <Link key={bid.id} to={`/tasks/${bid.taskId}`} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {bid.task?.poster?.name && <Avatar name={bid.task.poster.name} size={40} />}
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {bid.task?.category.icon} {bid.task?.title}
                  </p>
                  <p className="text-sm text-muted">Your bid: Rs. {bid.proposedAmount.toFixed(0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {bid.task && <StatusChip status={bid.task.status} />}
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    bid.status === "ACCEPTED"
                      ? "bg-green/15 text-green"
                      : bid.status === "REJECTED"
                      ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      : "bg-yellow/25 text-[#946200] dark:text-yellow"
                  }`}
                >
                  {bid.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PosterBidsView({ refreshUser }: { refreshUser: () => Promise<void> }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bidsByTask, setBidsByTask] = useState<Record<number, Bid[]>>({});
  const [loading, setLoading] = useState(true);
  const [acceptingBidId, setAcceptingBidId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { tasks } = await apiGet<{ tasks: Task[] }>("/tasks/mine?tab=posted");
      setTasks(tasks);

      const results = await Promise.all(
        tasks.map((t) => apiGet<{ bids: Bid[] }>(`/tasks/${t.id}/bids`).then((r) => [t.id, r.bids] as const))
      );
      setBidsByTask(Object.fromEntries(results));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept(bidId: number) {
    setAcceptingBidId(bidId);
    try {
      await apiPatch(`/bids/${bidId}/accept`, {});
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't accept this bid.");
    } finally {
      setAcceptingBidId(null);
    }
  }

  const tasksWithBids = tasks.filter((t) => (bidsByTask[t.id] ?? []).length > 0);

  return (
    <div className="space-y-5">
      <PageHeader icon="📝" title="Manage Bids" subtitle="Review and accept bids on the tasks you've posted." />
      {loading ? (
        <Spinner />
      ) : tasksWithBids.length === 0 ? (
        <EmptyState emoji="📝" title="No bids received yet" subtitle="Once Helpers bid on your tasks, they'll show up here." />
      ) : (
        <div className="space-y-6">
          {tasksWithBids.map((task) => {
            const bids = bidsByTask[task.id] ?? [];
            const anyAccepted = bids.some((b) => b.status === "ACCEPTED");
            return (
              <div key={task.id} className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Link to={`/tasks/${task.id}`} className="font-bold hover:underline">
                    {task.category.icon} {task.title}
                  </Link>
                  <StatusChip status={task.status} />
                </div>
                <div className="space-y-2">
                  {bids.map((bid) => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      disabled={anyAccepted || task.status !== "OPEN"}
                      accepting={acceptingBidId === bid.id}
                      onAccept={() => handleAccept(bid.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
