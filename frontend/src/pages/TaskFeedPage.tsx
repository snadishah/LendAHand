import { useEffect, useState, type FormEvent } from "react";
import { apiGet } from "../lib/api";
import type { Category, Task } from "../types";
import { TaskCard } from "../components/tasks/TaskCard";
import { EmptyState, Spinner } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";

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
    <div className="space-y-6">
      <PageHero
        eyebrow="Browse"
        title="Find your next gig."
        subtitle="Open tasks near you — filter by category or sort by distance."
        glyph="🔍"
      />

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
            📍 Sort
          </button>
        </form>
      </div>

      {loading ? (
        <Spinner />
      ) : tasks.length === 0 ? (
        <EmptyState emoji="🔍" title="No open tasks found" subtitle="Try a different category or check back later." />
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted">
              <span className="font-display font-bold text-ink dark:text-white text-lg">{tasks.length}</span> open{" "}
              {tasks.length === 1 ? "task" : "tasks"}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
