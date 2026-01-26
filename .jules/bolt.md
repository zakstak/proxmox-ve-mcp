# Bolt's Journal

## 2024-05-22 - [Optimizing Proxmox API Client]
**Learning:** `proxmox-api` allows injecting a custom `fetch` implementation. This enables us to use `undici.Agent` for better connection pooling and scoped SSL verification, avoiding the global `NODE_TLS_REJECT_UNAUTHORIZED` hack.
**Action:** Always check if wrapper libraries allow injecting the underlying HTTP client for better control over connections and security settings.
