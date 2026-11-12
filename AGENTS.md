# agent-ops — conventions for Codex

- TypeScript strict, Node 22+, ESM, Vitest. No `any`. Every tool input is a zod schema; the JSON Schema Codex sees is derived from it (`toInputSchema`).
- Tests first. Unit tests use the fake Codex (`tests/fake-Codex.ts`) and the fake embedder; no test needs an API key or the network, except the one semantic retrieval test that downloads the local embedding model once.
- Business rules live in tools, not in the prompt. The system prompt and the tool list are part of the cached prefix: keep them byte-for-byte stable (no dates, ids or reordering).
- Model: `Codex-opus-5-5` with explicit `output_config.effort` and server-side refusal fallbacks. Forced `tool_choice` returns 400 on this model; use `auto`.
- Never commit secrets: `.env` is ignored; `.env.example` lists the variables.
- If `npm test` fails with "Cannot find native binding" (an npm bug with optional dependencies after `npm install <pkg>`): `rm -rf node_modules package-lock.json && npm install`.
- Small commits, imperative English messages. Record design decisions in `docs/DECISIONS.md`.
