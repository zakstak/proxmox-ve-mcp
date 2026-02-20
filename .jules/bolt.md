## 2024-05-24 - Single-pass loop optimization
**Learning:** Chained `.filter().map()` operations on large arrays (e.g., cluster resources) are significantly slower than a single-pass `for...of` loop with conditional push (~50% overhead).
**Action:** Prefer single-pass loops for performance-sensitive list processing, especially when filtering and mapping are both required.
