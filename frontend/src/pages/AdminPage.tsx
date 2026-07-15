import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPatch, apiPost, ApiError } from "../lib/api";
import type { DisputeResolution } from "../types";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner, EmptyState } from "../components/ui/EmptyState";
import { StatusChip } from "../components/ui/StatusChip";

type Tab = "overview" | "disputes" | "users" | "tasks";

interface Stats {
  users: number;
  bannedUsers: number;
  tasks: Record<string, number>;
  openDisputes: number;
  escrowHeld: number;
}
interface AdminUser {
  id: number;
  name: string;
  email: string;
  userType: string;
  isAdmin: boolean;
  isBanned: boolean;
  walletBalance: number;
}
interface AdminTask {
  id: number;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "SUBMITTED" | "DONE" | "CANCELLED" | "DISPUTED";
  budget: number;
  poster: { id: number; name: string };
  helper: { id: number; name: string } | null;
}
interface AdminDispute {
  id: number;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  task: { id: number; title: string; acceptedAmount: number | null };
  raisedBy: { id: number; name: string };
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader icon="🛡️" title="Admin Console" subtitle="Moderate the marketplace, settle disputes, and keep users safe." />

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">{error}</div>
      )}

      <div className="flex gap-1 bg-[#F7F6F2] dark:bg-[#0B0B0B] rounded-full p-1 w-fit">
        {(["overview", "disputes", "users", "tasks"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-white dark:bg-[#242424] shadow-card text-ink dark:text-white" : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview onError={setError} />}
      {tab === "disputes" && <Disputes onError={setError} />}
      {tab === "users" && <Users onError={setError} />}
      {tab === "tasks" && <Tasks onError={setError} />}
    </div>
  );
}

function useError(onError: (m: string | null) => void) {
  return (err: unknown, fallback: string) => onError(err instanceof ApiError ? err.message : fallback);
}

function Overview({ onError }: { onError: (m: string | null) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const showError = useError(onError);

  useEffect(() => {
    apiGet<Stats>("/admin/stats").then(setStats).catch((e) => showError(e, "Couldn't load stats."));
  }, []);

  if (!stats) return <Spinner />;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Total Users" value={stats.users} />
      <Stat label="Banned" value={stats.bannedUsers} />
      <Stat label="Open Disputes" value={stats.openDisputes} accent={stats.openDisputes > 0} />
      <Stat label="Escrow Held" value={`Rs. ${stats.escrowHeld.toFixed(0)}`} />
      {Object.entries(stats.tasks).map(([status, count]) => (
        <Stat key={status} label={`Tasks · ${status}`} value={count} />
      ))}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${accent ? "text-ink dark:text-white" : ""}`}>{value}</p>
    </div>
  );
}

function Disputes({ onError }: { onError: (m: string | null) => void }) {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const showError = useError(onError);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { disputes } = await apiGet<{ disputes: AdminDispute[] }>("/admin/disputes?status=OPEN");
      setDisputes(disputes);
    } catch (e) {
      showError(e, "Couldn't load disputes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: number, resolution: DisputeResolution) {
    const label = resolution === "RELEASED" ? "release payment to the helper" : "refund the poster";
    if (!confirm(`Resolve this dispute and ${label}?`)) return;
    setBusyId(id);
    onError(null);
    try {
      await apiPost(`/admin/disputes/${id}/resolve`, { resolution });
      await load();
    } catch (e) {
      showError(e, "Couldn't resolve the dispute.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner />;
  if (disputes.length === 0) return <EmptyState emoji="✅" title="No open disputes" subtitle="Everything's settled." />;

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <div key={d.id} className="card p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Link to={`/tasks/${d.task.id}`} className="font-bold hover:underline">
              {d.task.title}
            </Link>
            <span className="text-sm font-semibold text-ink dark:text-white">Rs. {d.task.acceptedAmount?.toFixed(0) ?? "—"}</span>
          </div>
          <p className="text-sm">
            <span className="text-muted">Raised by {d.raisedBy.name}:</span> “{d.reason}”
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => resolve(d.id, "RELEASED")} disabled={busyId === d.id} className="btn-primary text-sm">
              Release to Helper
            </button>
            <button onClick={() => resolve(d.id, "REFUNDED")} disabled={busyId === d.id} className="btn-secondary text-sm">
              Refund Poster
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Users({ onError }: { onError: (m: string | null) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const showError = useError(onError);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { users } = await apiGet<{ users: AdminUser[] }>(`/admin/users${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      setUsers(users);
    } catch (e) {
      showError(e, "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load("");
  }, [load]);

  async function toggleBan(u: AdminUser) {
    if (!confirm(`${u.isBanned ? "Unban" : "Ban"} ${u.name}?`)) return;
    setBusyId(u.id);
    onError(null);
    try {
      await apiPatch(`/admin/users/${u.id}/ban`, { banned: !u.isBanned });
      await load(search);
    } catch (e) {
      showError(e, "Couldn't update this user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        className="flex gap-2"
      >
        <input className="input-field" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn-secondary shrink-0">
          Search
        </button>
      </form>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {u.name} {u.isAdmin && <span className="chip bg-purple/10 text-purple ml-1">Admin</span>}
                  {u.isBanned && <span className="chip bg-red-100 text-red-500 ml-1">Banned</span>}
                </p>
                <p className="text-xs text-muted truncate">
                  {u.email} · {u.userType} · Rs. {u.walletBalance.toFixed(0)}
                </p>
              </div>
              {!u.isAdmin && (
                <button
                  onClick={() => toggleBan(u)}
                  disabled={busyId === u.id}
                  className={u.isBanned ? "btn-secondary text-sm shrink-0" : "btn-ghost-danger text-sm shrink-0"}
                >
                  {u.isBanned ? "Unban" : "Ban"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tasks({ onError }: { onError: (m: string | null) => void }) {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const showError = useError(onError);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { tasks } = await apiGet<{ tasks: AdminTask[] }>("/admin/tasks");
      setTasks(tasks);
    } catch (e) {
      showError(e, "Couldn't load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(t: AdminTask) {
    if (!confirm(`Remove "${t.title}"? Any escrow is refunded to the poster.`)) return;
    setBusyId(t.id);
    onError(null);
    try {
      await apiPatch(`/admin/tasks/${t.id}/remove`, {});
      await load();
    } catch (e) {
      showError(e, "Couldn't remove this task.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div key={t.id} className="card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/tasks/${t.id}`} className="font-semibold truncate hover:underline block">
              {t.title}
            </Link>
            <p className="text-xs text-muted truncate">
              by {t.poster.name}
              {t.helper && ` · helper ${t.helper.name}`} · Rs. {t.budget.toFixed(0)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusChip status={t.status} />
            {t.status !== "DONE" && t.status !== "CANCELLED" && (
              <button onClick={() => remove(t)} disabled={busyId === t.id} className="btn-ghost-danger text-sm">
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
