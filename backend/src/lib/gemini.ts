const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const FALLBACK_MESSAGE =
  "The AI assistant is unavailable right now (no Gemini API key configured, or the request failed). You can still use every other feature of LendAHand normally.";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim() && key !== "your-gemini-key-here" ? key : null;
}

async function callGemini(contents: Array<{ role: string; parts: { text: string }[] }>): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? null;
  } catch {
    return null;
  }
}

export async function getPriceEstimate(description: string): Promise<string> {
  const prompt = `You are a pricing assistant for LendAHand, a Pakistani student task marketplace where prices are in Rupees (Rs.). A user wants to post this task: "${description}". In 2-3 short sentences, suggest a fair price range in Rs. and a rough time estimate to complete it. Be concise and practical.`;

  const result = await callGemini([{ role: "user", parts: [{ text: prompt }] }]);
  return result ?? FALLBACK_MESSAGE;
}

export async function chatWithGemini(message: string, history: ChatTurn[]): Promise<string> {
  const systemContext: ChatTurn[] = [
    {
      role: "user",
      text: "You are the LendAHand AI Assistant, embedded in a student task marketplace app. Task Posters hire Helpers for small gigs (tutoring, cleaning, deliveries, etc.) and pay in Rs. (Rupees) held in an in-app wallet with escrow. Answer questions about posting tasks, bidding, the wallet/escrow system, pricing tips, and finding nearby tasks. Keep answers friendly, concise (2-4 sentences), and specific to LendAHand's features.",
    },
    {
      role: "model",
      text: "Understood — I'm ready to help LendAHand users with posting tasks, bidding, wallet/escrow, pricing, and finding nearby work.",
    },
  ];

  const contents = [...systemContext, ...history, { role: "user" as const, text: message }].map(
    (turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })
  );

  const result = await callGemini(contents);
  return result ?? FALLBACK_MESSAGE;
}
