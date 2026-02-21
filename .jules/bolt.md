## 2025-05-24 - Array Iteration Optimization
**Learning:** Replacing chained `.filter().map()` with a single `for...of` loop provided a ~2.25x speedup in benchmarks for large datasets (100k items).
**Action:** Prefer single-pass loops for potentially large lists of resources (VMs, containers, snapshots) to minimize CPU overhead and memory allocation.
