import { loadCatalog } from "../tools/catalog.js";
import { loadPolicyChunks, citation } from "../tools/policies.js";
import type { AgentResult } from "../agent/loop.js";

export interface BehaviorCase {
  id: string;
  author: string;
  message: string;
  expect: {
    handoff: boolean;
    toolsAnyOf?: string[]; // at least one of these must be called (omit: no tool requirement)
  };
}

export interface CheckResult {
  name: "right tool" | "correct handoff" | "citation present" | "no invented prices";
  applies: boolean;
  passed: boolean;
  detail: string;
}

// Every price the agent may state: catalog prices plus the amounts written in the policies.
export function allowedPrices(): Set<number> {
  const prices = new Set(loadCatalog().map((p) => p.price_usd));
  for (const c of loadPolicyChunks()) for (const m of c.text.matchAll(/USD\s?(\d+(?:\.\d+)?)/g)) prices.add(Number(m[1]));
  return prices;
}

const PRICE = /(?:USD|US\$|\$)\s?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s?(?:USD|dollars|dólares)/gi;
const TAG = /\[([a-z-]+)#(\d+)\]/g;

export function pricesIn(text: string): number[] {
  return [...text.matchAll(PRICE)].map((m) => Number((m[1] ?? m[2])!.replace(",", ".")));
}

export function grade(c: BehaviorCase, result: AgentResult, allowed = allowedPrices(), validTags = new Set(loadPolicyChunks().map((k) => citation(k.doc, k.index)))): CheckResult[] {
  const called = new Set(result.log.flatMap((t) => t.tools));
  const usedPolicies = called.has("search_policies");
  const tags = [...result.reply.matchAll(TAG)].map((m) => `[${m[1]}#${m[2]}]`);
  // Numbers the customer wrote ("if I spend 50 dollars") may be repeated back: they are not invented.
  const said = new Set([...c.message.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", "."))));
  const invented = pricesIn(result.reply).filter((p) => !allowed.has(p) && !said.has(p));

  return [
    {
      name: "right tool",
      applies: Boolean(c.expect.toolsAnyOf?.length) && !c.expect.handoff,
      passed: !c.expect.toolsAnyOf?.length || c.expect.toolsAnyOf.some((t) => called.has(t)),
      detail: `called: ${[...called].join(", ") || "none"}`,
    },
    {
      name: "correct handoff",
      applies: true,
      passed: result.handedOff === c.expect.handoff,
      detail: result.handedOff ? `handed off (${result.handoffReason})` : "answered",
    },
    {
      name: "citation present",
      applies: usedPolicies && !result.handedOff,
      passed: tags.length > 0 && tags.every((t) => validTags.has(t)),
      detail: tags.join(" ") || "no tag",
    },
    {
      name: "no invented prices",
      applies: !result.handedOff,
      passed: invented.length === 0,
      detail: invented.length ? `not in catalog or policies: ${invented.join(", ")}` : `prices: ${pricesIn(result.reply).join(", ") || "none"}`,
    },
  ];
}
