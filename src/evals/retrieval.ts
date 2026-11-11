import type { SearchResult } from "../rag/store.js";

export interface RetrievalCase {
  id: string;
  author: string;
  question: string;
  // Acceptable chunks as "doc#index". Empty means the policies can't answer it: those cases
  // are reported apart and belong to the behavior eval (the agent should hand off).
  expected: string[];
}

export interface RetrievalRow {
  id: string;
  question: string;
  expected: string[];
  got: string[];
  gotDistances: number[];
  rank: number | null; // 1-based position of the first acceptable chunk, null if not in the top k
  topDistance: number;
}

export interface RetrievalSummary {
  answerable: number;
  hitAt1: number;
  hitAt3: number;
}

type Search = (query: string, limit: number) => Promise<SearchResult[]>;

export async function evaluateRetrieval(search: Search, cases: RetrievalCase[], k = 3): Promise<RetrievalRow[]> {
  const rows: RetrievalRow[] = [];
  for (const c of cases) {
    const results = await search(c.question, k);
    const got = results.map((r) => `${r.doc}#${r.index}`);
    const position = got.findIndex((tag) => c.expected.includes(tag));
    rows.push({ id: c.id, question: c.question, expected: c.expected, got, gotDistances: results.map((r) => r.distance), rank: position === -1 ? null : position + 1, topDistance: results[0]?.distance ?? NaN });
  }
  return rows;
}

// Recomputed from the rows every time, never stored, so the headline can't drift from the data.
export function summarize(rows: RetrievalRow[]): RetrievalSummary {
  const answerable = rows.filter((r) => r.expected.length > 0);
  return {
    answerable: answerable.length,
    hitAt1: answerable.filter((r) => r.rank === 1).length,
    hitAt3: answerable.filter((r) => r.rank !== null && r.rank <= 3).length,
  };
}
