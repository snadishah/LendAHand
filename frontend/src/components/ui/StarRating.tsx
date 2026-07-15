interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
}

const SIZE_CLASS = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

export function StarRating({ rating, count, size = "sm", interactive = false, onChange }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  const rounded = Math.round(rating);

  return (
    <span className={`inline-flex items-center gap-0.5 ${SIZE_CLASS[size]}`}>
      {stars.map((star) => (
        <span
          key={star}
          onClick={interactive ? () => onChange?.(star) : undefined}
          className={
            interactive
              ? "cursor-pointer text-ink dark:text-white hover:scale-110 transition-transform"
              : star <= rounded
              ? "text-ink dark:text-white"
              : "text-ink/20 dark:text-white/25"
          }
        >
          {interactive ? (star <= rounded ? "★" : "☆") : "★"}
        </span>
      ))}
      {count !== undefined && (
        <span className="ml-1 text-xs text-muted font-normal">
          {rating > 0 ? rating.toFixed(1) : "—"} ({count})
        </span>
      )}
    </span>
  );
}
