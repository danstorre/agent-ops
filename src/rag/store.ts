import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import type { Chunk } from "./chunk.js";
import { EMBEDDING_DIMS, type Embedder } from "./embed.js";

export interface SearchResult extends Chunk {
  distance: number;
}

// Postgres with pgvector, running in-process (PGlite). In production the same SQL runs on Supabase.
export async function createStore(embed: Embedder, dims = EMBEDDING_DIMS) {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE chunks (
      id serial PRIMARY KEY,
      doc text NOT NULL,
      chunk_index int NOT NULL,
      heading text NOT NULL,
      text text NOT NULL,
      embedding vector(${dims}) NOT NULL
    );
  `);

  return {
    async add(chunks: Chunk[]): Promise<void> {
      const vectors = await embed(chunks.map((c) => c.text));
      for (const [i, c] of chunks.entries()) {
        await db.query("INSERT INTO chunks (doc, chunk_index, heading, text, embedding) VALUES ($1, $2, $3, $4, $5)", [
          c.doc, c.index, c.heading, c.text, JSON.stringify(vectors[i]),
        ]);
      }
    },

    async search(query: string, limit = 3): Promise<SearchResult[]> {
      const [queryVector] = await embed([query]);
      // Dan's query: nearest chunks first, by cosine distance (<=>) between embeddings.
      const result = await db.query<{ doc: string; chunk_index: number; heading: string; text: string; distance: number }>(
        `SELECT doc, chunk_index, heading, text, embedding <=> $1 AS distance
         FROM chunks
         ORDER BY embedding <=> $1
         LIMIT $2`,
        [JSON.stringify(queryVector), limit],
      );
      return result.rows.map((r) => ({ doc: r.doc, index: r.chunk_index, heading: r.heading, text: r.text, distance: r.distance }));
    },

    close: () => db.close(),
  };
}

export type PolicyStore = Awaited<ReturnType<typeof createStore>>;
