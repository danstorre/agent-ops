import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { lookupCatalogTool, lookupCatalogInput } from "../tools/catalog.js";
import { bookAppointmentTool, bookAppointmentInput } from "../tools/booking.js";
import { buildPolicyStore, searchPoliciesTool, searchPoliciesInput } from "../tools/policies.js";
import { ToolInputError, type ToolHandler } from "../tools/types.js";
import type { Embedder } from "../rag/embed.js";

// The store's tools served over MCP, so any MCP client (Claude Code, Codex, Gemini CLI) can use
// them. Same handlers, descriptions and zod schemas as inside the agent loop; the client's own
// agent decides when to call them. handoff_to_human stays out: there's no store team behind it here.
export async function createStoreMcpServer(embed?: Embedder) {
  const policies = await buildPolicyStore(embed);
  const server = new McpServer({ name: "northside-store", version: "0.1.0" });

  const expose = (handler: ToolHandler, inputSchema: z.ZodObject) =>
    server.registerTool(handler.definition.name, { description: handler.definition.description, inputSchema }, async (args: unknown) => {
      try {
        return { content: [{ type: "text" as const, text: await handler.run(args) }] };
      } catch (error) {
        const reason = error instanceof ToolInputError ? `Invalid input: ${error.message}` : `Tool failed: ${String(error)}`;
        return { content: [{ type: "text" as const, text: reason }], isError: true };
      }
    });

  expose(lookupCatalogTool(), lookupCatalogInput);
  expose(searchPoliciesTool(policies), searchPoliciesInput);
  expose(bookAppointmentTool(), bookAppointmentInput);
  return { server, close: () => policies.close() };
}
