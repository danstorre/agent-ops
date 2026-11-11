# Roadmap

- [x] Typed tools, the agent loop, booking and handoff
- [x] Retrieval over the policies with citations
- [x] Cached system prompt and cost per model call
- [x] Retrieval eval: 30 customer questions, hit@1 and hit@3 against a keyword baseline, gated in CI
- [x] Behavior eval: the agent end to end on live conversations (right tool, correct handoff, citations, no invented prices), 14 of 36 run
- [x] Fix what the behavior eval found (hallucinated shipping destination) and re-run the failing case and two controls
- [ ] Re-run all behavior conversations on the fixed prompt
- [ ] Run all 36 conversations as the daily rate limit allows
- [ ] MCP server exposing the same tools, used from Claude Code
- [ ] Dockerfile and a short demo recording
