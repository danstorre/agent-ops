import { readFileSync } from "node:fs";
import { z } from "zod";
import { parseInput, toInputSchema, type ToolHandler } from "./types.js";

// What the model sends when it asks for the lookup_catalog tool.
// We check it before running the tool, so a bad request never reaches the catalog.
export const lookupCatalogInput = z.object({
  query: z.string().trim().min(1).max(200),
});

// TypeScript derives the type from the schema, so the shape is written only once.
export type LookupCatalogInput = z.infer<typeof lookupCatalogInput>;

export interface Product {
  sku: string;
  name: string;
  category: string;
  price_usd: number;
  sizes: Array<number | string>;
  colors: string[];
  stock: Record<string, number>;
}

export function loadCatalog(): Product[] {
  const file = new URL("../../data/catalog.json", import.meta.url);
  return JSON.parse(readFileSync(file, "utf8")) as Product[];
}

// Simple keyword search: a product scores one point per query word found in its name,
// category or colors. Good enough for a demo; retrieval over policies comes in task 1.3.
export function searchCatalog(catalog: Product[], query: string, limit = 3): Product[] {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length >= 2);
  return catalog
    .map((product) => {
      const haystack = `${product.name} ${product.category} ${product.colors.join(" ")}`.toLowerCase();
      const score = words.filter((w) => haystack.includes(w)).length;
      return { product, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product }) => product);
}

export function lookupCatalogTool(catalog: Product[] = loadCatalog()): ToolHandler {
  return {
    definition: {
      name: "lookup_catalog",
      description:
        "Search the store catalog by product name, category or color. Returns up to 3 matching products with price in USD, available sizes and stock per size. Use it before stating any price, size or stock.",
      input_schema: toInputSchema(lookupCatalogInput),
    },
    run: async (input) => {
      const { query } = parseInput(lookupCatalogInput, input);
      const matches = searchCatalog(catalog, query);
      return matches.length > 0 ? JSON.stringify(matches) : `No products matched "${query}".`;
    },
  };
}
