import { describe, it, expect } from "vitest";
import { evaluateRetrieval, summarize, type RetrievalCase } from "../src/evals/retrieval.js";
import type { SearchResult } from "../src/rag/store.js";

const hit = (doc: string, index: number, distance: number): SearchResult => ({ doc, index, heading: "", text: "", distance });

describe("retrieval eval", () => {
  const search = async (q: string): Promise<SearchResult[]> =>
    q === "first" ? [hit("a", 0, 0.1), hit("b", 0, 0.2), hit("c", 0, 0.3)] : [hit("b", 0, 0.1), hit("c", 0, 0.2), hit("a", 0, 0.3)];
  const cases: RetrievalCase[] = [
    { id: "1", author: "t", question: "first", expected: ["a#0"] },
    { id: "2", author: "t", question: "third", expected: ["a#0"] },
    { id: "3", author: "t", question: "miss", expected: ["z#9"] },
    { id: "4", author: "t", question: "unanswerable", expected: [] },
  ];

  it("records the rank of the first acceptable chunk", async () => {
    const rows = await evaluateRetrieval(search, cases);
    expect(rows.map((r) => r.rank)).toEqual([1, 3, null, null]);
  });

  it("counts hits only over answerable cases", async () => {
    expect(summarize(await evaluateRetrieval(search, cases))).toEqual({ answerable: 3, hitAt1: 1, hitAt3: 2 });
  });
});
