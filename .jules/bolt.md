# Bolt's Journal

## 2024-05-22 - [Optimizing Proxmox API Client]
**Learning:** `proxmox-api` allows injecting a custom `fetch` implementation. This enables us to use `undici.Agent` for better connection pooling and scoped SSL verification, avoiding the global `NODE_TLS_REJECT_UNAUTHORIZED` hack.
**Action:** Always check if wrapper libraries allow injecting the underlying HTTP client for better control over connections and security settings.

## 2024-05-24 - [Avoid N+1 in Proxmox VM Listing]
**Learning:** Proxmox API `qemu.$get` with `{ full: true }` triggers configuration file parsing for every VM, causing severe N+1 performance degradation. The standard list call returns sufficient data (`maxcpu` instead of `cpus`) for summaries.
**Action:** Avoid `{ full: true }` in list operations. Use standard summary fields and implement fallbacks (e.g., `cpus || maxcpu`) to maintain performance.
