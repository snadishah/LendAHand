import type { ChatTurn } from "../../types";

export function ChatBubble({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-r from-coral to-orange text-white px-4 py-2.5 text-sm shadow-card">
          {turn.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      <span className="text-xl shrink-0">🤖</span>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white dark:bg-[#141414] border border-[#E8E8E8] dark:border-white/10 px-4 py-2.5 text-sm shadow-card whitespace-pre-wrap">
        {turn.text}
      </div>
    </div>
  );
}
