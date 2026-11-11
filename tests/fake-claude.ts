import type Anthropic from "@anthropic-ai/sdk";
import type { CreateMessage } from "../src/agent/loop.js";

type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown };

// Builds a response shaped like the real API's, with only the fields the loop reads.
export function reply(stopReason: Anthropic.Message["stop_reason"], content: Block[]): Anthropic.Message {
  return {
    id: "msg_fake",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  } as unknown as Anthropic.Message;
}

// A fake model that plays back scripted responses in order and records every request.
export function fakeClaude(responses: Anthropic.Message[]) {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const createMessage: CreateMessage = async (params) => {
    calls.push(structuredClone(params));
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (!next) throw new Error("fakeClaude has no scripted responses");
    return next;
  };
  return { createMessage, calls };
}
