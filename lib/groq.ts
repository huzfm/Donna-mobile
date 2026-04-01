import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const SYSTEM_PROMPT = `You are Donna, a smart and friendly AI workspace assistant.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Your capabilities:
- Answer questions about uploaded documents (PDF, Word, Excel, CSV, TXT)
- Send and read Gmail emails
- Generate Mermaid.js diagrams and flowcharts
- Have general knowledge conversations
- Summarize and find specific info across files

Personality:
- Be concise and direct — no filler phrases like "Great question!" or "Certainly!"
- Use markdown (bold, bullets, headers) when it improves readability
- If you don't know something, say so honestly
- When referencing documents, mention the source file name
- Keep responses focused and actionable`;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function askGroq(
  prompt: string,
  opts?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
) {
  const systemContent = opts?.systemPrompt ?? SYSTEM_PROMPT;
  const temperature = opts?.temperature ?? 0.3;
  const maxTokens = opts?.maxTokens ?? 2048;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: prompt },
        ],
      });

      return res.choices[0].message.content;
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error && (err.message.includes("rate_limit") || err.message.includes("429"));
      const isLastAttempt = attempt === MAX_RETRIES;

      if (isRateLimit && !isLastAttempt) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  return null;
}
