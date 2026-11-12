import { describe, it, expect } from "vitest";
import { judgeReply } from "../src/evals/judge.js";
import { fakeClaude, reply } from "./fake-claude.js";

describe("judgeReply", () => {
  it("parses the judge's scores and keeps its reason for a human to spot-check", async () => {
    const claude = fakeClaude([reply("end_turn", [{ type: "text", text: 'Here you go: {"polite": 5, "clear": 4, "brief": 5, "reason": "Warm and to the point."}' }])]);
    const verdict = await judgeReply(claude.createMessage, "Can I pay with Visa?", "Yes, Visa works [payments#0].");
    expect(verdict).toEqual({ polite: 5, clear: 4, brief: 5, reason: "Warm and to the point." });
    expect(claude.calls[0]!.system).toContain("1 (bad) to 5 (great)");
  });

  it("rejects a verdict with a score outside 1 to 5", async () => {
    const claude = fakeClaude([reply("end_turn", [{ type: "text", text: '{"polite": 9, "clear": 4, "brief": 5, "reason": "x"}' }])]);
    await expect(judgeReply(claude.createMessage, "hi", "hello")).rejects.toThrow(/out of range/);
  });
});
