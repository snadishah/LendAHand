import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Task } from "../types";
import { TaskCard } from "../components/tasks/TaskCard";
import { EmptyState, Spinner } from "../components/ui/EmptyState";
import { MapView } from "../components/map/MapView";

type Tab = "open" | "mine";

export function DashboardPage() {
  const { user } = useAuth();
  const isPoster = user?.userType === "POSTER";
  const [tab, setTab] = useState<Tab>("open");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mapTasks, setMapTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const req =
      tab === "open"
        ? apiGet<{ tasks: Task[] }>("/tasks?status=OPEN")
        : apiGet<{ tasks: Task[] }>(`/tasks/mine?tab=${isPoster ? "posted" : "helping"}`);
    req.then(({ tasks }) => !cancelled && setTasks(tasks)).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, isPoster]);

  useEffect(() => {
    apiGet<{ tasks: Task[] }>("/tasks/map").then(({ tasks }) => setMapTasks(tasks));
    apiGet<{ tasks: Task[] }>(`/tasks/mine?tab=${isPoster ? "posted" : "helping"}`).then(({ tasks }) => setMine(tasks));
  }, [isPoster]);

  const openNear = mapTasks.filter((t) => t.status === "OPEN").length;
  const active = mine.filter((t) => t.status === "IN_PROGRESS" || t.status === "SUBMITTED").length;

  return (
    <div className="space-y-6">
      {/* Hero band */}
      <section className="relative overflow-hidden rounded-card bg-ink text-paper dark:bg-white dark:text-ink p-7 sm:p-10">
        <div className="absolute -right-10 -top-16 text-[16rem] leading-none opacity-[0.06] select-none pointer-events-none font-display">★</div>
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="eyebrow !text-paper/50 dark:!text-ink/50">{isPoster ? "Task Poster" : "Helper"}</p>
            <h1 className="mt-3 font-display font-bold tracking-tightest leading-[0.95] text-[clamp(2rem,6vw,3.75rem)]">
              Welcome back,
              <br />
              {user?.name?.split(" ")[0]}.
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              {isPoster ? (
                <Link to="/tasks/new" className="rounded-full px-5 py-2.5 font-semibold bg-paper text-ink dark:bg-ink dark:text-paper hover:opacity-90 transition-opacity">
                  Post a Task →
                </Link>
              ) : (
                <Link to="/tasks" className="rounded-full px-5 py-2.5 font-semibold bg-paper text-ink dark:bg-ink dark:text-paper hover:opacity-90 transition-opacity">
                  Browse Tasks →
                </Link>
              )}
              <Link to="/wallet" className="rounded-full px-5 py-2.5 font-semibold border border-paper/40 dark:border-ink/30 hover:bg-paper/10 dark:hover:bg-ink/10 transition-colors">
                My Wallet
              </Link>
            </div>
          </div>
          <div className="shrink-0">
            <p className="eyebrow !text-paper/50 dark:!text-ink/50">Wallet balance</p>
            <p className="font-display font-bold tracking-tightest text-[clamp(2.5rem,7vw,4.5rem)] leading-none">
              Rs. {(user?.walletBalance ?? 0).toFixed(0)}
            </p>
          </div>
        </div>
      </section>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Open near you" value={openNear} />
        <Stat label={isPoster ? "Tasks posted" : "Tasks helping"} value={mine.length} />
        <Stat label="In progress" value={active} />
      </div>

      {/* Tasks + map */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex gap-1 rounded-full border border-ink/12 dark:border-white/15 p-1">
              <TabButton active={tab === "open"} onClick={() => setTab("open")}>Open</TabButton>
              <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>Mine</TabButton>
            </div>
            <Link to="/tasks" className="text-xs font-semibold hover:underline underline-offset-4">View all →</Link>
          </div>
          {loading ? (
            <Spinner />
          ) : tasks.length === 0 ? (
            <EmptyState emoji="📋" title="Nothing here yet" subtitle="Check back soon or browse all open tasks." />
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {tasks.slice(0, 6).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-2 overflow-hidden">
          <p className="font-display font-semibold px-3 py-2">🗺️ Tasks near you</p>
          <div className="h-[440px] rounded-xl overflow-hidden">
            <MapView tasks={mapTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display font-bold text-3xl sm:text-4xl tracking-tightest">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-ink text-paper dark:bg-white dark:text-ink" : "text-muted hover:text-ink dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
