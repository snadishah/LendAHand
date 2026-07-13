import type { TaskStatus } from "../../types";

const CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "chip-open" },
  IN_PROGRESS: { label: "In Progress", className: "chip-progress" },
  SUBMITTED: { label: "Awaiting Confirmation", className: "chip-submitted" },
  DONE: { label: "Done", className: "chip-done" },
  CANCELLED: { label: "Cancelled", className: "chip-cancelled" },
  DISPUTED: { label: "Disputed", className: "chip-disputed" },
};

export function StatusChip({ status }: { status: TaskStatus }) {
  const { label, className } = CONFIG[status];
  return <span className={className}>{label}</span>;
}
