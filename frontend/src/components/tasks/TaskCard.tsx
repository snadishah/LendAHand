import { Link } from "react-router-dom";
import type { Task } from "../../types";
import { StatusChip } from "../ui/StatusChip";

export function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="card block p-4 hover:shadow-card-lg hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{task.category.icon}</span>
          <span>{task.category.name}</span>
        </div>
        <StatusChip status={task.status} />
      </div>

      <h3 className="font-bold mt-2 mb-1 line-clamp-1">{task.title}</h3>
      <p className="text-sm text-muted line-clamp-2 mb-3">{task.description}</p>

      <div className="flex items-center justify-between text-sm">
        <span className="font-extrabold text-coral">Rs. {task.budget.toFixed(0)}</span>
        {task.distanceKm != null && (
          <span className="chip bg-purple/10 text-purple">📍 {task.distanceKm.toFixed(1)} km</span>
        )}
      </div>
    </Link>
  );
}
