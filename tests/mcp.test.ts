import { describe, it, expect, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createStoreMcpServer } from "../src/mcp/server.js";
import { keywordEmbedder } from "../src/rag/keyword-embedder.js";

const text = (r: unknown) => ((r as { content: Array<{ text: string }> }).content[0]!.text);

describe("MCP server", async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const { server, close } = await createStoreMcpServer(keywordEmbedder);
  await server.connect(serverSide);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientSide);
  afterAll(async () => { await client.close(); await close(); });

  it("lists the store's three tools with their descriptions and schemas", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["book_appointment", "lookup_catalog", "search_policies"]);
    expect(tools.find((t) => t.name === "lookup_catalog")!.inputSchema.properties).toHaveProperty("query");
  });

  it("answers a catalog call", async () => {
    expect(text(await client.callTool({ name: "lookup_catalog", arguments: { query: "Pacer 3" } }))).toContain("Pacer 3");
  });

  it("returns cited policy passages", async () => {
    expect(text(await client.callTool({ name: "search_policies", arguments: { query: "store hours on Saturday" } }))).toMatch(/\[store-and-appointments#\d+\]/);
  });

  it("returns a business-rule rejection as an error result, not a crash", async () => {
    const result = await client.callTool({ name: "book_appointment", arguments: { service: "shoe_fitting", date: "2030-11-17", time: "11:00", customer_name: "Leo" } });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("closed on Sundays");
  });
});
