import { describe, it, expect } from "vitest";
import { loadCatalog, searchCatalog } from "../src/tools/catalog.js";

describe("searchCatalog", () => {
  const catalog = loadCatalog();

  it("finds a product by name", () => {
    expect(searchCatalog(catalog, "Pacer 3")[0]?.sku).toBe("RUN-001");
  });

  it("returns nothing when no word matches", () => {
    expect(searchCatalog(catalog, "snowboard")).toEqual([]);
  });
});
