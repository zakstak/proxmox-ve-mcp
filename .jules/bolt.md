## 2024-03-01 - [Optimize JSON serialization for MCP payloads]
**Learning:** Compact JSON serialization (omitting `null, 2` in `JSON.stringify`) reduces payload size by ~27-30% and serialization time by ~25-40% for datasets of ~100 items. This is particularly important for this codebase's architecture, which returns large resource lists via MCP tools, to optimize payload size and token usage for LLM consumption.
**Action:** Consistently use `JSON.stringify(data)` without pretty-printing formats (`null, 2`) across all MCP tool implementations returning lists of resources.
