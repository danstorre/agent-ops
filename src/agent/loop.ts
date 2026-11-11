import type Anthropic from "@anthropic-ai/sdk";
import { ToolInputError, type ToolHandler } from "../tools/types.js";
import { HANDOFF_TOOL_NAME, handoffInput } from "../tools/handoff.js";
import { costOfTurn, PRICES_PER_MILLION, type Prices } from "./cost.js";

// The one function the loop needs from the Claude client. Injecting it lets tests use a
// fake model with no network and no API key.
export type CreateMessage = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

export interface RunAgentOptions {
  createMessage: CreateMessage;
  system: string;
  tools: ToolHandler[];
  userMessage: string;
  history?: Anthropic.MessageParam[];
  model?: string;
  maxTurns?: number;
  onTurn?: (log: TurnLog) => void;
  prices?: Prices;
}

// One line per model call: what Claude did, the four token counters and what it cost.
export interface TurnLog {
  turn: number;
  stop_reason: Anthropic.Message["stop_reason"];
  tools: string[];
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface AgentResult {
  reply: string;
  turns: number;
  handedOff: boolean;
  handoffReason?: string;
  messages: Anthropic.MessageParam[];
  log: TurnLog[];
  costUsd: number;
}

export const HANDOFF_REPLY = "Let me connect you with a person from our team, they'll reply here shortly.";

export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const { createMessage, system, tools, userMessage, history = [], model = "claude-opus-5-5", maxTurns = 6, onTurn, prices = PRICES_PER_MILLION } = options;
  const log: TurnLog[] = [];
  const done = (r: Omit<AgentResult, "log" | "costUsd">): AgentResult => ({
    ...r,
    log,
    costUsd: log.reduce((sum, t) => sum + t.cost_usd, 0),
  });
  // Claude keeps no memory between calls, so we send the whole conversation every time.
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userMessage }];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const response = await createMessage({
      model,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      // Fixed part first (tools, then instructions) with a cache breakpoint at its end; the
      // top-level marker also caches the growing conversation. Cache reads cost 20x less.
      tools: tools.map((t) => t.definition),
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      cache_control: { type: "ephemeral" },
      messages,
    });
    messages.push({ role: "assistant", content: response.content });
    const entry: TurnLog = {
      turn,
      stop_reason: response.stop_reason,
      tools: response.content.filter((b) => b.type === "tool_use").map((b) => (b as Anthropic.ToolUseBlock).name),
      input_tokens: response.usage.input_tokens ?? 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      output_tokens: response.usage.output_tokens ?? 0,
      cost_usd: costOfTurn(response.usage, prices),
    };
    log.push(entry);
    onTurn?.(entry);

    if (response.stop_reason === "tool_use") {
      const requests = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      // Claude decided a person should take over: stop here and pass the reason to the team.
      const handoff = requests.find((r) => r.name === HANDOFF_TOOL_NAME);
      if (handoff) {
        const parsed = handoffInput.safeParse(handoff.input);
        const handoffReason = parsed.success ? parsed.data.reason : "no reason given";
        return done({ reply: HANDOFF_REPLY, turns: turn, handedOff: true, handoffReason, messages });
      }
      // Every result goes back with the id of its request, all in one user message.
      const results = await Promise.all(requests.map((request) => runTool(tools, request)));
      messages.push({ role: "user", content: results });
      continue;
    }

    if (response.stop_reason === "refusal") {
      return done({ reply: HANDOFF_REPLY, turns: turn, handedOff: true, handoffReason: "model refused", messages });
    }

    return done({ reply: textOf(response), turns: turn, handedOff: false, messages });
  }

  // Safety guard: the model kept asking for tools. Stop spending and hand off to a person.
  return done({ reply: HANDOFF_REPLY, turns: maxTurns, handedOff: true, handoffReason: "turn limit reached", messages });
}

async function runTool(tools: ToolHandler[], request: Anthropic.ToolUseBlock): Promise<Anthropic.ToolResultBlockParam> {
  const tool = tools.find((t) => t.definition.name === request.name);
  if (!tool) {
    return { type: "tool_result", tool_use_id: request.id, content: `Unknown tool: ${request.name}`, is_error: true };
  }
  try {
    return { type: "tool_result", tool_use_id: request.id, content: await tool.run(request.input) };
  } catch (error) {
    const reason = error instanceof ToolInputError ? `Invalid input: ${error.message}` : `Tool failed: ${String(error)}`;
    return { type: "tool_result", tool_use_id: request.id, content: reason, is_error: true };
  }
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
