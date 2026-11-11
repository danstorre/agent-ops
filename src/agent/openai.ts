import OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import type { CreateMessage } from "./loop.js";

type ChatCreate = (body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming) => Promise<OpenAI.Chat.Completions.ChatCompletion>;

// List prices in USD per million tokens, for cost estimates only (check current pricing).
// OpenAI caches long prompts automatically: cached input is billed at a discount, with no write fee.
export const OPENAI_PRICES: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
  "gpt-4o": { input: 2.5, cacheWrite: 2.5, cacheRead: 1.25, output: 10 },
  "gpt-4o-mini": { input: 0.15, cacheWrite: 0.15, cacheRead: 0.075, output: 0.6 },
  "gpt-4.1": { input: 2, cacheWrite: 2, cacheRead: 0.5, output: 8 },
  "gpt-4.1-mini": { input: 0.4, cacheWrite: 0.4, cacheRead: 0.1, output: 1.6 },
};
export const GPT_4O_PRICES = OPENAI_PRICES["gpt-4o"]!;

// The same CreateMessage interface the loop uses for Claude, backed by OpenAI Chat Completions.
// It translates the request out and the response back, so the loop, the tools, retrieval and the
// evals don't change when the provider does.
export function openAIClient(options: { model?: string; create?: ChatCreate } = {}): CreateMessage {
  const model = options.model ?? "gpt-4o";
  let create = options.create;
  return async (params) => {
    if (!create) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? process.env.OPENAI_KEY });
      create = (body) => client.chat.completions.create(body);
    }
    return fromOpenAI(await create(toOpenAI(params, model)));
  };
}

const textOf = (content: string | Array<{ type: string; text?: string }>): string =>
  typeof content === "string" ? content : content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");

export function toOpenAI(params: Anthropic.MessageCreateParamsNonStreaming, model: string): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.system) messages.push({ role: "system", content: textOf(params.system as string | Array<{ type: string; text?: string }>) });

  for (const m of params.messages) {
    if (typeof m.content === "string") {
      messages.push({ role: m.role, content: m.content });
      continue;
    }
    const blocks = m.content as unknown as Array<{ type: string; [k: string]: unknown }>;
    if (m.role === "assistant") {
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text as string).join("\n");
      const toolCalls = blocks
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ id: b.id as string, type: "function" as const, function: { name: b.name as string, arguments: JSON.stringify(b.input) } }));
      messages.push({ role: "assistant", content: text || null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) });
    } else {
      // A tool result in Claude's format becomes one "tool" message per call, matched by id.
      for (const b of blocks.filter((b) => b.type === "tool_result")) {
        const content = textOf(b.content as string | Array<{ type: string; text?: string }>);
        messages.push({ role: "tool", tool_call_id: b.tool_use_id as string, content: b.is_error ? `Error: ${content}` : content });
      }
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text as string).join("\n");
      if (text) messages.push({ role: "user", content: text });
    }
  }

  const tools = (params.tools ?? [])
    .filter((t): t is Anthropic.Tool => "input_schema" in t)
    .map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description ?? "", parameters: t.input_schema as Record<string, unknown> } }));

  return { model, messages, max_completion_tokens: Math.min(params.max_tokens, 4096), ...(tools.length ? { tools } : {}) };
}

const STOP: Record<string, Anthropic.Message["stop_reason"]> = { tool_calls: "tool_use", stop: "end_turn", length: "max_tokens", content_filter: "refusal" };

export function fromOpenAI(completion: OpenAI.Chat.Completions.ChatCompletion): Anthropic.Message {
  const choice = completion.choices[0]!;
  const content: Array<Record<string, unknown>> = [];
  if (choice.message.content) content.push({ type: "text", text: choice.message.content, citations: null });
  for (const call of choice.message.tool_calls ?? []) {
    if (call.type !== "function") continue;
    let input: unknown;
    try {
      input = JSON.parse(call.function.arguments);
    } catch {
      input = { unparsed_arguments: call.function.arguments }; // fails schema validation, Claude-style error result
    }
    content.push({ type: "tool_use", id: call.id, name: call.function.name, input });
  }
  const cached = completion.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    id: completion.id,
    type: "message",
    role: "assistant",
    model: completion.model,
    content,
    stop_reason: STOP[choice.finish_reason] ?? "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: (completion.usage?.prompt_tokens ?? 0) - cached,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: cached,
      output_tokens: completion.usage?.completion_tokens ?? 0,
    },
  } as unknown as Anthropic.Message;
}
