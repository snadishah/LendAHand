import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  glyph?: string;
}

// The signature bold ink hero used across the app for a consistent, premium
// black-and-white header.
export function PageHero({ eyebrow, title, subtitle, actions, glyph }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-card bg-ink text-paper dark:bg-white dark:text-ink p-7 sm:p-9">
      {glyph && (
        <div className="absolute -right-6 -top-14 text-[13rem] leading-none opacity-[0.06] font-display select-none pointer-events-none">
          {glyph}
        </div>
      )}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow !text-paper/50 dark:!text-ink/50">{eyebrow}</p>}
          <h1 className="mt-3 font-display font-bold tracking-tightest leading-[0.95] text-[clamp(1.9rem,5vw,3.25rem)]">
            {title}
          </h1>
          {subtitle && <p className="mt-3 max-w-lg text-paper/60 dark:text-ink/60">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </section>
  );
}
