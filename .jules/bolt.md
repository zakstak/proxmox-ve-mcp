# Bolt's Journal

## 2024-05-22 - [Optimizing Proxmox API Client]
**Learning:** `proxmox-api` allows injecting a custom `fetch` implementation. This enables us to use `undici.Agent` for better connection pooling and scoped SSL verification, avoiding the global `NODE_TLS_REJECT_UNAUTHORIZED` hack.
**Action:** Always check if wrapper libraries allow injecting the underlying HTTP client for better control over connections and security settings.

## 2026-01-30 - [N+1 Bottleneck in VM Listing]
**Learning:** `proxmox.nodes.$(node).qemu.$get({ full: true })` triggers a config file parse for *every* VM, causing severe N+1 latency. `proxmox.cluster.resources.$get()` serves data from the `pvestatd` memory cache, which is instant.
**Action:** Always verify if an "expensive" flag (like `full: true`) is necessary. Use aggregate/cached endpoints (like `cluster/resources`) for lists, even if it requires client-side filtering or slight schema adjustments (e.g., `maxcpu` vs `cpus`).
