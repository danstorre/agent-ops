import { readdirSync, readFileSync } from "node:fs";
import { z } from "zod";
import { chunkMarkdown, type Chunk } from "../rag/chunk.js";
import { localEmbedder, type Embedder } from "../rag/embed.js";
import { createStore, type PolicyStore } from "../rag/store.js";
import { parseInput, toInputSchema, type ToolHandler } from "./types.js";

export const searchPoliciesInput = z.object({
  query: z.string().trim().min(1).max(200),
});

export function loadPolicyChunks(): Chunk[] {
  const dir = new URL("../../data/policies/", import.meta.url);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .flatMap((f) => chunkMarkdown(f.replace(/\.md$/, ""), readFileSync(new URL(f, dir), "utf8")));
}

export async function buildPolicyStore(embed: Embedder = localEmbedder()): Promise<PolicyStore> {
  const store = await createStore(embed);
  await store.add(loadPolicyChunks());
  return store;
}

// The tag Claude must cite, e.g. [shipping#1].
export const citation = (doc: string, index: number) => `[${doc}#${index}]`;

export function searchPoliciesTool(store: PolicyStore): ToolHandler {
  return {
    definition: {
      name: "search_policies",
      description:
        "Search the store policies (shipping, returns, sizing, payments, hours and appointments). Returns the most relevant passages, each with a citation tag like [shipping#1]. Answer policy questions only from these passages and include the tag of every passage you used.",
      input_schema: toInputSchema(searchPoliciesInput),
    },
    run: async (input) => {
      const { query } = parseInput(searchPoliciesInput, input);
      const results = await store.search(query, 3);
      return results.map((r) => `${citation(r.doc, r.index)}\n${r.text}`).join("\n\n");
    },
  };
}
