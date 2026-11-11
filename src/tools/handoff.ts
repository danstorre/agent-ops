import { z } from "zod";
import { toInputSchema, type ToolHandler } from "./types.js";

export const HANDOFF_TOOL_NAME = "handoff_to_human";

export const handoffInput = z.object({
  reason: z.string().trim().min(1).max(300),
});

// Claude calls this when a person should take over. The loop stops as soon as it sees the
// call, so run() only exists to satisfy the ToolHandler shape.
export function handoffTool(): ToolHandler {
  return {
    definition: {
      name: HANDOFF_TOOL_NAME,
      description:
        "Hand the conversation to a person on the store team. Use it when the customer is upset, asks for a person, wants a refund or exception the policies don't cover, or when you can't answer from the catalog and policies. Give a one-sentence reason for the team.",
      input_schema: toInputSchema(handoffInput),
    },
    run: async () => "Handoff requested.",
  };
}
