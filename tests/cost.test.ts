import { describe, it, expect } from "vitest";
import { costOfTurn } from "../src/agent/cost.js";
import { runAgent } from "../src/agent/loop.js";
import { lookupCatalogTool } from "../src/tools/catalog.js";
import { fakeClaude, reply } from "./fake-claude.js";

describe("costOfTurn", () => {
  it("prices a call without cache: 1,000 input + 100 output = USD 0.006", () => {
    expect(costOfTurn({ input_tokens: 1000, output_tokens: 100 })).toBeCloseTo(0.006, 10);
  });

  it("charges the cache write once, then the cheap read", () => {
    const first = costOfTurn({ input_tokens: 50, cache_creation_input_tokens: 1000, cache_read_input_tokens: 0, output_tokens: 80 });
    const second = costOfTurn({ input_tokens: 120, cache_creation_input_tokens: 0, cache_read_input_tokens: 1050, output_tokens: 60 });
    expect(first).toBeCloseTo(0.0068, 10); //  50*4 + 1000*5 + 80*20 = 6,800 / 1M
    expect(second).toBeCloseTo(0.00189, 10); // 120*4 + 1050*0.20 + 60*20 = 1,890 / 1M
    expect(second).toBeLessThan(first);
  });

  it("treats missing cache counters as zero", () => {
    expect(costOfTurn({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: null, cache_read_input_tokens: null })).toBe(0);
  });
});

describe("runAgent cost log", () => {
  it("logs one line per model call and adds up the cost", async () => {
    const claude = fakeClaude([
      reply("tool_use", [{ type: "tool_use", id: "toolu_1", name: "lookup_catalog", input: { query: "socks" } }]),
      reply("end_turn", [{ type: "text", text: "Merino socks, USD 24." }]),
    ]);

    const result = await runAgent({ createMessage: claude.createMessage, system: "Store assistant.", tools: [lookupCatalogTool()], userMessage: "socks?" });

    expect(result.log.map((t) => t.tools)).toEqual([["lookup_catalog"], []]);
    expect(result.costUsd).toBeCloseTo(result.log[0]!.cost_usd + result.log[1]!.cost_usd, 12);
  });
});
