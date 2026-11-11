# Design decisions

Each entry: the decision, why, and the alternative I rejected.

## Validate every tool input with zod
- **Decision:** each tool parses its input with a zod schema before running; a failed parse becomes an `is_error` tool result.
- **Why:** the model can call a tool with bad arguments (empty search, invented size, impossible date). Rejecting them before they reach the catalog or the calendar prevents wrong bookings and crashes, and the error message lets Claude correct itself.
- **Rejected:** trusting the model's arguments and handling errors inside each tool.

## A manual agent loop with a turn limit
- **Decision:** `runAgent` calls Claude, runs every requested tool, sends all results back in one user message with their `tool_use_id`, and stops on `end_turn` or after `maxTurns`, handing off to a person.
- **Why:** the API is stateless, so the loop owns the conversation. The turn limit caps cost when the model keeps calling tools. Unknown tools and bad inputs become error results instead of crashes.
- **Rejected:** the SDK's tool runner. It's the right default for production; the manual loop makes every step explicit and testable here.

## Business rules in tools, handoff as a tool
- **Decision:** booking rules (hours, Sundays, last slot, double booking, past dates) are code inside `book_appointment`. Handing off is a tool, `handoff_to_human`, that the model chooses, with a reason for the team.
- **Why:** rules in code are deterministic and testable; the model only decides when to call them. A rejected booking comes back with a reason Claude can relay.
- **Rejected:** store hours in the system prompt, trusting the model to respect them.

## Retrieval over the policies
- **Decision:** one chunk per `##` section, keeping the document title; local embeddings (all-MiniLM-L6-v2, 384 dims); pgvector via PGlite (the same SQL runs on Supabase); `ORDER BY embedding <=> $1 LIMIT $2`; passages returned with `[doc#chunk]` tags for citation.
- **Why:** sending every policy on every call costs more and doesn't scale. Search by meaning finds "shipping costs" for "how much does delivery cost?", which keyword search misses. The vectors are only for finding; the model reads the passages' text.
- **Testing:** a deterministic word-overlap fake embedder for fast unit tests, plus one test with the real model for the semantic match. The nearest chunk isn't always relevant, so retrieval gets its own evals next.
- **Rejected:** putting all policies in the system prompt.

## A stable, cached prefix
- **Decision:** tools first in a fixed order, then the instructions with a cache breakpoint, then the conversation with a top-level automatic marker. A test fails if a date or time appears in the system prompt.
- **Why:** after the first call the prefix (about 1,000 tokens) is read from cache at 1/20 of the input price and with lower latency. Caching is a byte-exact prefix match, so one timestamp or a reordered tool list silently turns every call back into full price.

## Cost per model call
- **Decision:** `costOfTurn` prices each call from its four token counters (USD per million on Claude Opus 5.5: input 4, cache write 5, cache read 0.20, output 20). The loop logs one line per call and returns the total.
- **Why:** one customer message can be several calls with tools, so cost per conversation is the number the business cares about. The log is also the cache monitor. Output is the most expensive token and can't be cached, so the prompt asks for two-or-three-sentence replies.

## The same tools over MCP
- **Decision:** an MCP server (`src/mcp`) registers the store's tools with the same handlers, descriptions and zod schemas the agent loop uses; a project `.mcp.json` lets Claude Code start it over stdio. `handoff_to_human` is not exposed, since there is no store team behind an MCP client.
- **Why:** tools written once work in any MCP client (Claude Code, Codex, Gemini CLI). Business-rule rejections come back as `isError` results, as in the loop. Stdout carries the protocol, so library logs are sent to stderr.
- **Rejected:** a separate HTTP API per client.
