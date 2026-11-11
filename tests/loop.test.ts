import { describe, it, expect } from "vitest";
import { runAgent, HANDOFF_REPLY } from "../src/agent/loop.js";
import { lookupCatalogTool } from "../src/tools/catalog.js";
import { handoffTool } from "../src/tools/handoff.js";
import { fakeClaude, reply } from "./fake-claude.js";

const system = "You are the assistant of a running store.";
const tools = [lookupCatalogTool(), handoffTool()];

describe("runAgent", () => {
  it("returns Claude's final text when it ends the turn", async () => {
    const claude = fakeClaude([reply("end_turn", [{ type: "text", text: "We open at 10 am." }])]);

    const result = await runAgent({ createMessage: claude.createMessage, system, tools, userMessage: "When do you open?" });

    expect(result.reply).toBe("We open at 10 am.");
    expect(result.handedOff).toBe(false);
    expect(claude.calls).toHaveLength(1);
  });

  it("runs the requested tool and sends the result back with the same id", async () => {
    const claude = fakeClaude([
      reply("tool_use", [{ type: "tool_use", id: "toolu_1", name: "lookup_catalog", input: { query: "Pacer 3" } }]),
      reply("end_turn", [{ type: "text", text: "Yes, 4 pairs in size 42." }]),
    ]);

    const result = await runAgent({ createMessage: claude.createMessage, system, tools, userMessage: "Pacer 3 in 42?" });

    const secondCall = claude.calls[1]!;
    const lastMessage = secondCall.messages.at(-1)!;
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content).toEqual([
      expect.objectContaining({ type: "tool_result", tool_use_id: "toolu_1", content: expect.stringContaining("Pacer 3") }),
    ]);
    expect(result.reply).toBe("Yes, 4 pairs in size 42.");
  });

  it("rejects a bad tool input and tells Claude instead of crashing", async () => {
    const claude = fakeClaude([
      reply("tool_use", [{ type: "tool_use", id: "toolu_2", name: "lookup_catalog", input: { query: "" } }]),
      reply("end_turn", [{ type: "text", text: "What product are you looking for?" }]),
    ]);

    await runAgent({ createMessage: claude.createMessage, system, tools, userMessage: "hi" });

    const toolResult = (claude.calls[1]!.messages.at(-1)!.content as Array<{ is_error?: boolean }>)[0]!;
    expect(toolResult.is_error).toBe(true);
  });

  it("hands off to a person when the model keeps asking for tools past maxTurns", async () => {
    const claude = fakeClaude([
      reply("tool_use", [{ type: "tool_use", id: "toolu_3", name: "lookup_catalog", input: { query: "shoes" } }]),
    ]);

    const result = await runAgent({ createMessage: claude.createMessage, system, tools, userMessage: "shoes", maxTurns: 3 });

    expect(result.handedOff).toBe(true);
    expect(result.reply).toBe(HANDOFF_REPLY);
    expect(claude.calls).toHaveLength(3);
  });

  it("stops and hands off when Claude calls handoff_to_human, keeping the reason", async () => {
    const claude = fakeClaude([
      reply("tool_use", [{ type: "tool_use", id: "toolu_4", name: "handoff_to_human", input: { reason: "Customer is upset about a damaged pair" } }]),
    ]);

    const result = await runAgent({ createMessage: claude.createMessage, system, tools, userMessage: "My shoes broke after one run!!" });

    expect(result.handedOff).toBe(true);
    expect(result.handoffReason).toBe("Customer is upset about a damaged pair");
    expect(claude.calls).toHaveLength(1);
  });

  it("sends the same cached instructions on every call, so the prompt cache can hit", async () => {
    const claude = fakeClaude([
      reply("tool_use", [{ type: "tool_use", id: "toolu_5", name: "lookup_catalog", input: { query: "socks" } }]),
      reply("end_turn", [{ type: "text", text: "Merino socks, USD 24." }]),
    ]);

    await runAgent({ createMessage: claude.createMessage, system, tools, userMessage: "socks?" });

    const [first, second] = claude.calls;
    expect(second!.system).toEqual(first!.system);
    expect(second!.tools).toEqual(first!.tools);
    expect(first!.system).toEqual([{ type: "text", text: system, cache_control: { type: "ephemeral" } }]);
  });
});
