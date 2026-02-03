# Bolt's Journal

## 2024-05-22 - [Optimizing Proxmox API Client]
**Learning:** `proxmox-api` allows injecting a custom `fetch` implementation. This enables us to use `undici.Agent` for better connection pooling and scoped SSL verification, avoiding the global `NODE_TLS_REJECT_UNAUTHORIZED` hack.
**Action:** Always check if wrapper libraries allow injecting the underlying HTTP client for better control over connections and security settings.

## 2024-05-22 - [Optimizing Tool Response Payloads]
**Learning:** Pretty-printing JSON responses (`JSON.stringify(obj, null, 2)`) in MCP tools adds significant whitespace overhead (newlines and spaces), increasing token usage and payload size for LLMs without providing machine-readable value.
**Action:** Use compact JSON serialization (`JSON.stringify(obj)`) for all tool responses intended for LLM consumption.
