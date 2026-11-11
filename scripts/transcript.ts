// Read one saved eval conversation step by step: npm run transcript -- <case id> [model]
// Shows what the customer wrote, every tool the model called with its input, what each tool
// returned, and the final reply. Reading transcripts is how you find out *why* a check failed.
import { readFileSync } from "node:fs";

const [id, model = "gpt-4.1-mini"] = process.argv.slice(2);
if (!id) throw new Error("usage: npm run transcript -- <case id> [model]");
const file = new URL(`../evals/runs/behavior-${model}.jsonl`, import.meta.url);
const row = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l)).find((r) => r.id === id);
if (!row) throw new Error(`no saved run for ${id} with ${model}`);
if (!row.messages) throw new Error(`${id} was saved before transcripts were recorded; delete its line in ${file.pathname} and run the eval for it again`);

const show = (label: string, text: string) => console.log(`\n${label}\n  ${text.replace(/\n/g, "\n  ")}`);
for (const m of row.messages as Array<{ role: string; content: string | Array<Record<string, unknown>> }>) {
  if (typeof m.content === "string") { show(m.role === "user" ? "CUSTOMER" : "AGENT", m.content); continue; }
  for (const b of m.content) {
    if (b.type === "text" && b.text) show("AGENT", b.text as string);
    if (b.type === "tool_use") show(`MODEL CALLS ${b.name}`, JSON.stringify(b.input));
    if (b.type === "tool_result") show(`TOOL RETURNS${b.is_error ? " (error)" : ""}`, String(b.content));
  }
}
console.log(`\nRESULT  handed off: ${row.handedOff}${row.handoffReason ? ` (${row.handoffReason})` : ""} · model calls: ${row.log.length} · cost USD ${row.costUsd.toFixed(5)}\n`);
