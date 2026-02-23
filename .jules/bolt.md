## 2025-05-22 - List Processing Optimization
**Learning:** For large resource lists (VMs/Containers), a single-pass `for...of` loop with conditional `push` is significantly faster (~25% speedup) than `.filter().map()` chains. Additionally, using compact `JSON.stringify` (without indentation) reduces payload size by ~30%, which benefits LLM context usage and network transfer.
**Action:** When handling bulk data transformations for MCP tools, prefer single-pass loops and compact JSON serialization.
