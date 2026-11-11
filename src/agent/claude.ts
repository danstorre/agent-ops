import Anthropic from "@anthropic-ai/sdk";
import type { CreateMessage } from "./loop.js";

// The real model behind the same interface the tests fake. Bring your own key: the SDK reads
// ANTHROPIC_API_KEY (or an `ant auth login` profile). If Claude declines a request on safety
// grounds, the API retries it on a fallback model ("default" routing); if the whole chain
// still refuses, the loop hands the customer to a person.
export function claudeClient(client: Anthropic = new Anthropic()): CreateMessage {
  return async (params) => {
    const response = await client.beta.messages.create({
      ...(params as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming),
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);
    return response as unknown as Anthropic.Message;
  };
}
