# Bolt's Journal

## 2024-05-22 - [Optimizing Proxmox API Client]
**Learning:** `proxmox-api` allows injecting a custom `fetch` implementation. This enables us to use `undici.Agent` for better connection pooling and scoped SSL verification, avoiding the global `NODE_TLS_REJECT_UNAUTHORIZED` hack.
**Action:** Always check if wrapper libraries allow injecting the underlying HTTP client for better control over connections and security settings.

## 2024-05-24 - [Avoid N+1 Config Reads in Proxmox Lists]
**Learning:** `proxmox.nodes.$('node').qemu.$get({ full: true })` triggers a configuration file read for every VM, which is an O(N) operation and slow on large clusters. Standard listing relies on `pvestatd` (shared memory) and is O(1) relative to disk I/O.
**Action:** Avoid `full: true` in list operations. Use `maxcpu` from the summary view as a fallback for `cpus` (core count) if needed.
