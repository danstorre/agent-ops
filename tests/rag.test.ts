import { describe, it, expect, afterAll } from "vitest";
import { buildPolicyStore, searchPoliciesTool } from "../src/tools/policies.js";
import { localEmbedder } from "../src/rag/embed.js";
import { fakeEmbedder } from "./fake-embedder.js";

describe("policy search with the fake embedder (word overlap)", async () => {
  const store = await buildPolicyStore(fakeEmbedder);
  afterAll(() => store.close());

  it("returns the nearest chunks first, closest distance first", async () => {
    const results = await store.search("refund worn running shoes", 3);
    expect(results[0]!.doc).toBe("returns");
    expect(results[0]!.distance).toBeLessThanOrEqual(results[1]!.distance);
  });

  it("formats tool output with a citation tag per passage", async () => {
    const output = await searchPoliciesTool(store).run({ query: "store hours on Saturday" });
    expect(output).toMatch(/^\[store-and-appointments#\d+\]/);
  });
});

describe("policy search with the real local model (meaning, not words)", async () => {
  const store = await buildPolicyStore(localEmbedder());
  afterAll(() => store.close());

  it("finds the shipping costs for a question that never says 'shipping'", async () => {
    const [top] = await store.search("how much does delivery cost?", 1);
    expect(top!.doc).toBe("shipping");
    expect(top!.heading).toBe("Costs");
  }, 60_000);
});
