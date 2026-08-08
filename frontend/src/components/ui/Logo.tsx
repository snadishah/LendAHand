// LendAHand mark: two interlocking rings — two people/parties coming together.
// Uses currentColor so it works on any background (ink panels, light, dark).
export function Logo({ withWordmark = true, className = "" }: { withWordmark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
        <circle cx="12.5" cy="16" r="7.25" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="19.5" cy="16" r="7.25" stroke="currentColor" strokeWidth="2.4" />
      </svg>
      {withWordmark && <span className="font-display font-bold tracking-tightest">LendAHand</span>}
    </span>
  );
}
