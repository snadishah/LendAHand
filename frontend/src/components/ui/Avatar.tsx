const PALETTE = ["#FF6B6B", "#FF9F53", "#4ECDC4", "#A78BFA", "#FFD166", "#22C55E"];
const YELLOW = "#FFD166";

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const second = words.length > 1 ? words[1][0] ?? "" : "";
  return (first + second).toUpperCase();
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 36 }: AvatarProps) {
  const bg = PALETTE[hashString(name) % PALETTE.length];
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full font-bold select-none shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        color: bg === YELLOW ? "#1E293B" : "#FFFFFF",
        fontSize: Math.max(10, Math.round(size * 0.38)),
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
