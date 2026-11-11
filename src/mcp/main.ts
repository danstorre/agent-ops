// Starts the store's MCP server over stdio: npm run mcp (Claude Code starts it from .mcp.json).
// Stdout carries the MCP protocol, so any library log goes to stderr instead.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createStoreMcpServer } from "./server.js";

console.log = console.error;
const { server } = await createStoreMcpServer();
await server.connect(new StdioServerTransport());
