import { describe, it, expect } from "vitest";
import { lookupCatalogInput } from "../src/tools/catalog.js";

// Day 1, task 1 (red on purpose): tool inputs are validated with zod before any model call.
describe("lookup_catalog input", () => {
  it("accepts a query with a reasonable length", () => {
    const parsed = lookupCatalogInput.safeParse({ query: "red running shoes size 42" });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty query", () => {
    const parsed = lookupCatalogInput.safeParse({ query: "" });
    expect(parsed.success).toBe(false);
  });
});
