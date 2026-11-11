import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { openAIClient, toOpenAI } from "../src/agent/openai.js";
import { runAgent } from "../src/agent/loop.js";
import { lookupCatalogTool } from "../src/tools/catalog.js";

const completion = (message: Partial<OpenAI.Chat.Completions.ChatCompletionMessage>, finish: string): OpenAI.Chat.Completions.ChatCompletion =>
  ({
    id: "chatcmpl_fake",
    object: "chat.completion",
    created: 0,
    model: "gpt-4o",
    choices: [{ index: 0, finish_reason: finish, logprobs: null, message: { role: "assistant", content: null, refusal: null, ...message } }],
    usage: { prompt_tokens: 1200, completion_tokens: 40, total_tokens: 1240, prompt_tokens_details: { cached_tokens: 1024 } },
  }) as unknown as OpenAI.Chat.Completions.ChatCompletion;

describe("OpenAI adapter", () => {
  it("runs the same agent loop on OpenAI: tool call out, tool result back by id, final text", async () => {
    const requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[] = [];
    const replies = [
      completion({ tool_calls: [{ id: "call_1", type: "function", function: { name: "lookup_catalog", arguments: '{"query":"Pacer 3"}' } }] }, "tool_calls"),
      completion({ content: "Pacer 3 is USD 120, 4 pairs in 42." }, "stop"),
    ];
    const createMessage = openAIClient({ create: async (body) => (requests.push(structuredClone(body)), replies[requests.length - 1]!) });

    const result = await runAgent({ createMessage, system: "Store assistant.", tools: [lookupCatalogTool()], userMessage: "Pacer 3 in 42?" });

    expect(result.reply).toBe("Pacer 3 is USD 120, 4 pairs in 42.");
    const toolMessage = requests[1]!.messages.at(-1)!;
    expect(toolMessage).toMatchObject({ role: "tool", tool_call_id: "call_1" });
    expect(String((toolMessage as { content: string }).content)).toContain("Pacer 3");
  });

  it("maps OpenAI's cached prompt tokens to the cache-read counter", async () => {
    const createMessage = openAIClient({ create: async () => completion({ content: "Hi" }, "stop") });
    const result = await runAgent({ createMessage, system: "s", tools: [], userMessage: "hi" });
    expect(result.log[0]).toMatchObject({ input_tokens: 176, cache_read_input_tokens: 1024, output_tokens: 40 });
  });

  it("sends the instructions as the system message and the tools as functions", () => {
    const body = toOpenAI(
      { model: "x", max_tokens: 100, system: [{ type: "text", text: "Be brief." }], tools: [lookupCatalogTool().definition], messages: [{ role: "user", content: "hi" }] },
      "gpt-4o",
    );
    expect(body.messages[0]).toEqual({ role: "system", content: "Be brief." });
    expect(body.tools?.[0]).toMatchObject({ type: "function", function: { name: "lookup_catalog" } });
  });
});
