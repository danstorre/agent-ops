import { describe, it, expect } from "vitest";
import { grade, pricesIn, allowedPrices, type BehaviorCase } from "../src/evals/behavior.js";
import type { AgentResult } from "../src/agent/loop.js";

const result = (reply: string, tools: string[][], handedOff = false): AgentResult =>
  ({ reply, handedOff, turns: tools.length, messages: [], costUsd: 0, log: tools.map((t, i) => ({ turn: i + 1, tools: t })) }) as unknown as AgentResult;
const byName = (checks: ReturnType<typeof grade>) => Object.fromEntries(checks.map((c) => [c.name, c]));
const policyCase: BehaviorCase = { id: "t", author: "t", message: "shipping cost?", expect: { handoff: false, toolsAnyOf: ["search_policies"] } };

describe("behavior graders", () => {
  it("reads prices in USD, $ and 'dollars'", () => {
    expect(pricesIn("USD 120, $35 or 6 dollars")).toEqual([120, 35, 6]);
  });

  it("knows the catalog and policy prices", () => {
    const allowed = allowedPrices();
    for (const p of [120, 199, 80, 6, 15]) expect(allowed.has(p)).toBe(true);
    expect(allowed.has(110)).toBe(false);
  });

  it("passes a cited policy answer with real prices", () => {
    const checks = byName(grade(policyCase, result("Free over USD 80, otherwise USD 6 [shipping#2]", [["search_policies"], []])));
    expect(Object.values(checks).filter((c) => c.applies).every((c) => c.passed)).toBe(true);
  });

  it("catches an invented price (Pacer 3 at USD 110)", () => {
    const c: BehaviorCase = { id: "p", author: "t", message: "Pacer price?", expect: { handoff: false, toolsAnyOf: ["lookup_catalog"] } };
    expect(byName(grade(c, result("The Pacer 3 costs USD 110.", [["lookup_catalog"], []])))["no invented prices"]!.passed).toBe(false);
  });

  it("catches a policy answer without a citation", () => {
    expect(byName(grade(policyCase, result("Shipping is free over USD 80.", [["search_policies"], []])))["citation present"]!.passed).toBe(false);
  });

  it("catches a missed handoff", () => {
    const c: BehaviorCase = { id: "h", author: "t", message: "I want a refund NOW", expect: { handoff: true } };
    expect(byName(grade(c, result("Sure!", [[]])))["correct handoff"]!.passed).toBe(false);
  });

  it("does not flag a number the customer wrote themselves", () => {
    const c: BehaviorCase = { id: "c", author: "t", message: "do I pay for delivery if I spend 50 dollars?", expect: { handoff: false, toolsAnyOf: ["search_policies"] } };
    expect(byName(grade(c, result("At $50 you pay USD 6; it's free over USD 80 [shipping#2]", [["search_policies"], []])))["no invented prices"]!.passed).toBe(true);
  });
});
