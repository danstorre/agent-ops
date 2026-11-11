// Turns texts into vectors of numbers where similar meaning means nearby vectors.
export type Embedder = (texts: string[]) => Promise<number[][]>;

export const EMBEDDING_DIMS = 384;

// Runs all-MiniLM-L6-v2 locally: no API key, the model downloads once and is cached.
export function localEmbedder(): Embedder {
  let extractor: Promise<(texts: string[], options: object) => Promise<{ tolist(): unknown }>> | undefined;
  return async (texts) => {
    if (!extractor) {
      extractor = import("@huggingface/transformers").then(
        (t) => t.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as never,
      );
    }
    const run = await extractor;
    const output = await run(texts, { pooling: "mean", normalize: true });
    return output.tolist() as number[][];
  };
}
