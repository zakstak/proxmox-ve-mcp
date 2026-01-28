# Bolt's Journal

## 2024-05-22 - [Optimizing Proxmox API Client]
**Learning:** `proxmox-api` allows injecting a custom `fetch` implementation. This enables us to use `undici.Agent` for better connection pooling and scoped SSL verification, avoiding the global `NODE_TLS_REJECT_UNAUTHORIZED` hack.
**Action:** Always check if wrapper libraries allow injecting the underlying HTTP client for better control over connections and security settings.

## 2024-05-23 - [Proxmox VM List Optimization]
**Learning:** `nodes/{node}/qemu.$get({ full: true })` parses config files for every VM, causing N+1 latency. `cluster/resources` avoids this but lacks `pid`. The standard `qemu.$get()` (without `full`) uses shared memory status, is fast, and includes `pid`, but `cpus` (core count) must be accessed via `maxcpu`.
**Action:** When listing VMs, use `nodes/{node}/qemu.$get()` without `{ full: true }` and fallback `cpus` to `maxcpu`. Avoid `cluster/resources` if `pid` is needed.
