import type { Embedder } from "../src/rag/embed.js";

// Deterministic stand-in for the real model: each word bumps one of 384 slots. Texts that share
// words end up close. It knows nothing about meaning (it can't tell "delivery" ~ "shipping"),
// which is exactly what the real model adds; see the semantic test in rag.test.ts.
export const fakeEmbedder: Embedder = async (texts) =>
  texts.map((text) => {
    const v = new Array<number>(384).fill(0);
    for (const word of text.toLowerCase().split(/\W+/).filter((w) => w.length > 2)) {
      let h = 0;
      for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) % 384;
      v[h]! += 1;
    }
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  });
