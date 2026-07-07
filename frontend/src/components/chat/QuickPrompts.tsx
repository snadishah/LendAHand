const PROMPTS = [
  { icon: "➕", text: "How do I post a task?" },
  { icon: "💬", text: "How does bidding work?" },
  { icon: "💰", text: "What is the wallet?" },
  { icon: "🔒", text: "How does escrow work?" },
  { icon: "✨", text: "Tips for pricing my task" },
  { icon: "📍", text: "How to find tasks near me?" },
];

export function QuickPrompts({ onSelect, disabled }: { onSelect: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="card p-4 space-y-2">
      <p className="font-bold text-sm mb-1">Quick Questions</p>
      {PROMPTS.map((p) => (
        <button
          key={p.text}
          disabled={disabled}
          onClick={() => onSelect(p.text)}
          className="w-full text-left text-sm rounded-xl px-3 py-2.5 bg-[#F7F6F2] dark:bg-slate-900 hover:bg-purple/10 hover:text-purple transition-colors disabled:opacity-50"
        >
          {p.icon} {p.text}
        </button>
      ))}
    </div>
  );
}
