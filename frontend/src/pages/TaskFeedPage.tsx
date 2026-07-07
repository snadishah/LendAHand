import { useEffect, useState, type FormEvent } from "react";
import { apiGet } from "../lib/api";
import type { Category, Task } from "../types";
import { TaskCard } from "../components/tasks/TaskCard";
import { EmptyState, Spinner } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function TaskFeedPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [near, setNear] = useState("");
  const [appliedNear, setAppliedNear] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ categories: Category[] }>("/categories").then(({ categories }) => setCategories(categories));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: "OPEN" });
    if (categoryId) params.set("categoryId", categoryId);
    if (appliedNear) params.set("near", appliedNear);

    apiGet<{ tasks: Task[] }>(`/tasks?${params.toString()}`)
      .then(({ tasks }) => setTasks(tasks))
      .finally(() => setLoading(false));
  }, [categoryId, appliedNear]);

  function handleSortByDistance(e: FormEvent) {
    e.preventDefault();
    setAppliedNear(near);
  }

  return (
    <div className="space-y-5">
      <PageHeader icon="🔍" title="Browse Open Tasks" subtitle="Find work near you, sorted the way that suits you." />

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <select className="input-field sm:w-56" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>

        <form onSubmit={handleSortByDistance} className="flex-1 flex gap-2">
          <input
            className="input-field"
            placeholder="Enter your location to sort by distance..."
            value={near}
            onChange={(e) => setNear(e.target.value)}
          />
          <button type="submit" className="btn-secondary shrink-0">
            📍 Sort by Distance
          </button>
        </form>
      </div>

      {loading ? (
        <Spinner />
      ) : tasks.length === 0 ? (
        <EmptyState emoji="🔍" title="No open tasks found" subtitle="Try a different category or check back later." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
