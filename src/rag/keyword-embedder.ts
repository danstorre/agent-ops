import type { Embedder } from "./embed.js";

// Keyword baseline: each word bumps one of 384 slots, so texts that share words end up close.
// It knows nothing about meaning ("delivery" is not "shipping"). Used for fast deterministic tests
// and as the baseline the real model must beat in the retrieval eval.
export const keywordEmbedder: Embedder = async (texts) =>
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
