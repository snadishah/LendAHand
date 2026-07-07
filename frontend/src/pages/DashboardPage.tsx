import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Task } from "../types";
import { TaskCard } from "../components/tasks/TaskCard";
import { EmptyState, Spinner } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { MapView } from "../components/map/MapView";

type Tab = "open" | "mine";

export function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("open");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mapTasks, setMapTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const req =
      tab === "open"
        ? apiGet<{ tasks: Task[] }>("/tasks?status=OPEN")
        : apiGet<{ tasks: Task[] }>(`/tasks/mine?tab=${user?.userType === "POSTER" ? "posted" : "helping"}`);

    req.then(({ tasks }) => {
      if (!cancelled) setTasks(tasks);
    }).finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [tab, user?.userType]);

  useEffect(() => {
    apiGet<{ tasks: Task[] }>("/tasks/map").then(({ tasks }) => setMapTasks(tasks));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user?.userType === "POSTER" ? "Welcome back" : "Ready to help"}, ${user?.name?.split(" ")[0]} 👋`}
        subtitle={
          user?.userType === "POSTER"
            ? "Post a task or check in on the ones you've already posted."
            : "Browse open tasks nearby and start earning."
        }
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-[#F7F6F2] dark:bg-slate-900 rounded-full p-1">
              <TabButton active={tab === "open"} onClick={() => setTab("open")}>
                Open Tasks
              </TabButton>
              <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
                My Tasks
              </TabButton>
            </div>
            <Link to="/tasks" className="text-xs font-semibold text-coral hover:underline">
              View all →
            </Link>
          </div>

          {loading ? (
            <Spinner />
          ) : tasks.length === 0 ? (
            <EmptyState emoji="📋" title="Nothing here yet" subtitle="Check back soon or browse all open tasks." />
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {tasks.slice(0, 6).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-2 overflow-hidden">
          <p className="font-bold px-2 py-1 text-sm">🗺️ Tasks Near You</p>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <MapView tasks={mapTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-white dark:bg-slate-700 shadow-card text-coral" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}
