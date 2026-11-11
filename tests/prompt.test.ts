import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT } from "../src/agent/prompt.js";

describe("SYSTEM_PROMPT", () => {
  it("contains nothing that changes between calls (dates, times), so it stays cacheable", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/);
  });

  it("names every tool the agent has", () => {
    for (const tool of ["lookup_catalog", "search_policies", "book_appointment", "handoff_to_human"]) {
      expect(SYSTEM_PROMPT).toContain(tool);
    }
  });
});
