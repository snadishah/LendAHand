import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiPost, ApiError } from "../lib/api";
import type { ChatTurn } from "../types";
import { ChatBubble } from "../components/chat/ChatBubble";
import { QuickPrompts } from "../components/chat/QuickPrompts";
import { PageHeader } from "../components/ui/PageHeader";

const WELCOME: ChatTurn = {
  role: "model",
  text: "Hi! I'm the LendAHand AI Assistant 🤖 — ask me anything about posting tasks, bidding, wallet, escrow, or pricing.",
};

export function ChatPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    const history = turns.filter((t) => t !== WELCOME).slice(-10);
    const nextTurns: ChatTurn[] = [...turns, { role: "user", text }];
    setTurns(nextTurns);
    setInput("");
    setSending(true);
    try {
      const { reply } = await apiPost<{ reply: string }>("/ai/chat", { message: text, history });
      setTurns((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        { role: "model", text: err instanceof ApiError ? err.message : "Something went wrong. Try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="space-y-5">
      <PageHeader icon="🤖" title="AI Chat Assistant" subtitle="Ask about posting tasks, bidding, wallet, escrow, or pricing." />

      <div className="grid lg:grid-cols-3 gap-5 h-[calc(100vh-240px)] min-h-[420px]">
        <div className="lg:col-span-2 card flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {turns.map((t, i) => (
              <ChatBubble key={i} turn={t} />
            ))}
            {sending && <ChatBubble turn={{ role: "model", text: "Thinking..." }} />}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-ink/10 dark:border-white/10 p-3 flex gap-2">
            <input
              className="input-field"
              placeholder="Ask me anything about LendAHand..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={sending} className="btn-primary shrink-0">
              Send
            </button>
          </form>
        </div>

        <QuickPrompts onSelect={send} disabled={sending} />
      </div>
    </div>
  );
}
