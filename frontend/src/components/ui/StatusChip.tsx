import type { TaskStatus } from "../../types";

const CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "chip-open" },
  IN_PROGRESS: { label: "In Progress", className: "chip-progress" },
  DONE: { label: "Done", className: "chip-done" },
  CANCELLED: { label: "Cancelled", className: "chip-cancelled" },
};

export function StatusChip({ status }: { status: TaskStatus }) {
  const { label, className } = CONFIG[status];
  return <span className={className}>{label}</span>;
}
