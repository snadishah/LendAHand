export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 py-14 px-6 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="font-semibold text-navy dark:text-slate-100">{title}</p>
      {subtitle && <p className="text-sm text-muted max-w-xs">{subtitle}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-14">
      <div className="h-8 w-8 rounded-full border-4 border-coral/30 border-t-coral animate-spin" />
    </div>
  );
}
