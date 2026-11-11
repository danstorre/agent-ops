import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "../src/rag/chunk.js";

const doc = `# Shipping

Intro line about the store.

## Delivery times
Standard delivery takes 3 to 5 business days.

## Costs
Standard shipping is free on orders of USD 80 or more.

## Empty
`;

describe("chunkMarkdown", () => {
  it("makes one chunk per section with text, skipping empty sections", () => {
    const chunks = chunkMarkdown("shipping", doc);
    expect(chunks.map((c) => c.heading)).toEqual(["Shipping", "Delivery times", "Costs"]);
  });

  it("keeps the document title in every chunk so it makes sense alone", () => {
    const costs = chunkMarkdown("shipping", doc).find((c) => c.heading === "Costs")!;
    expect(costs.text).toBe("Shipping — Costs\nStandard shipping is free on orders of USD 80 or more.");
  });

  it("numbers chunks in order within each document", () => {
    expect(chunkMarkdown("shipping", doc).map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it("returns one chunk for a document without sections", () => {
    const chunks = chunkMarkdown("payments", "# Payments\n\nWe accept cards.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe("Payments\nWe accept cards.");
  });
});
