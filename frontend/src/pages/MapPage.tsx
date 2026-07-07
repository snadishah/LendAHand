import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { Task } from "../types";
import { MapView } from "../components/map/MapView";
import { Spinner } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function MapPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { tasks } = await apiGet<{ tasks: Task[] }>("/tasks/map");
    setTasks(tasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleFindMe() {
    if (!navigator.geolocation) {
      setLocateError("Geolocation isn't supported in this browser.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateError("Couldn't get your location. Check browser permissions.");
        setLocating(false);
      }
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-220px)] min-h-[520px] flex flex-col">
      <PageHeader
        icon="🗺️"
        title="Task Map"
        subtitle="All tasks with a known location, color-coded by status."
        actions={
          <>
            <button onClick={handleFindMe} disabled={locating} className="btn-secondary">
              {locating ? "Locating..." : "📍 Find Me"}
            </button>
            <button onClick={load} className="btn-secondary">
              🔄 Refresh
            </button>
          </>
        }
      />

      {locateError && <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">{locateError}</div>}

      <div className="flex gap-3 text-xs">
        <Legend color="#22C55E" label="Open" />
        <Legend color="#FFD166" label="In Progress" />
        <Legend color="#94A3B8" label="Done" />
        <Legend color="#EF4444" label="Cancelled" />
      </div>

      <div className="card p-2 flex-1 min-h-0 overflow-hidden">
        {loading ? <Spinner /> : (
          <div className="h-full rounded-xl overflow-hidden">
            <MapView tasks={tasks} userLocation={userLocation} />
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
