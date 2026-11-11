// Live chat with the store agent: npm run chat. Needs your own key (ANTHROPIC_API_KEY or `ant auth login`).
import { createInterface } from "node:readline/promises";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "../src/agent/loop.js";
import { claudeClient } from "../src/agent/claude.js";
import { SYSTEM_PROMPT } from "../src/agent/prompt.js";
import { storeTools } from "../src/agent/store-agent.js";
import { buildPolicyStore } from "../src/tools/policies.js";

const tools = storeTools(await buildPolicyStore());
const createMessage = claudeClient();
const rl = createInterface({ input: process.stdin, output: process.stdout });
let history: Anthropic.MessageParam[] = [];

console.log("Northside Running Co. assistant (fictional store). Ctrl+C to quit.\n");
for (;;) {
  const userMessage = await rl.question("you> ");
  const result = await runAgent({
    createMessage, system: SYSTEM_PROMPT, tools, userMessage, history,
    onTurn: (t) => console.error(JSON.stringify(t)),
  });
  history = result.messages;
  console.log(`bot> ${result.reply}${result.handedOff ? `\n     [handed off: ${result.handoffReason}]` : ""}\n     [cost USD ${result.costUsd.toFixed(5)}]\n`);
}
