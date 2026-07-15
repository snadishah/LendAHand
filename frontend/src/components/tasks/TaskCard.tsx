import { Link } from "react-router-dom";
import type { Task } from "../../types";
import { StatusChip } from "../ui/StatusChip";

export function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="card group block p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          <span className="text-base">{task.category.icon}</span>
          <span>{task.category.name}</span>
        </div>
        <StatusChip status={task.status} />
      </div>

      <h3 className="font-display font-semibold text-lg mt-3 mb-1.5 line-clamp-1 group-hover:underline underline-offset-4 decoration-1">
        {task.title}
      </h3>
      <p className="text-sm text-muted line-clamp-2 mb-4">{task.description}</p>

      <div className="flex items-center justify-between pt-3 border-t border-ink/8 dark:border-white/10">
        <span className="font-display font-bold text-xl tracking-tightest">Rs. {task.budget.toFixed(0)}</span>
        {task.distanceKm != null && (
          <span className="chip border-ink/20 text-ink dark:border-white/25 dark:text-white normal-case tracking-normal">
            📍 {task.distanceKm.toFixed(1)} km
          </span>
        )}
      </div>
    </Link>
  );
}
