import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// A tool the agent can use: what Claude sees (definition) and what our code runs (run).
export interface ToolHandler {
  definition: Anthropic.Tool;
  run: (input: unknown) => Promise<string>;
}

// Thrown when the model sends arguments that fail the schema. The loop turns it into
// an error tool_result so Claude can read the problem and try again.
export class ToolInputError extends Error {}

// Builds the JSON Schema Claude needs from our zod schema, so the shape is written once.
export function toInputSchema(schema: z.ZodType): Anthropic.Tool.InputSchema {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  return jsonSchema as Anthropic.Tool.InputSchema;
}

// Parses tool input or throws ToolInputError with a short, readable reason.
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ToolInputError(parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
  }
  return parsed.data;
}
