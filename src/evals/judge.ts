import type { CreateMessage } from "../agent/loop.js";

// LLM judge: for qualities code can't check exactly (tone, clarity). It scores a reply against a
// written rubric, so it doesn't improvise, and it must explain each score so a human can spot-check it.
export const RUBRIC = `Score the assistant's reply to the customer on each criterion, 1 (bad) to 5 (great):
- polite: friendly and respectful, never curt or condescending.
- clear: the customer can tell what to do next without rereading.
- brief: two or three sentences, no filler.
Answer ONLY with JSON: {"polite": n, "clear": n, "brief": n, "reason": "one sentence"}.`;

export interface Verdict {
  polite: number;
  clear: number;
  brief: number;
  reason: string;
}

export async function judgeReply(createMessage: CreateMessage, customer: string, reply: string, model = "claude-opus-5-5"): Promise<Verdict> {
  const response = await createMessage({
    model,
    max_tokens: 500,
    system: RUBRIC,
    messages: [{ role: "user", content: `Customer: ${customer}\n\nAssistant reply: ${reply}` }],
  });
  const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error(`judge did not return JSON: ${text.slice(0, 80)}`);
  const v = JSON.parse(json) as Verdict;
  for (const k of ["polite", "clear", "brief"] as const) if (!(v[k] >= 1 && v[k] <= 5)) throw new Error(`judge score out of range: ${k}=${v[k]}`);
  return v;
}
