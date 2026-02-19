
## 2026-02-19 - JSON Serialization Optimization
**Learning:** Removing indentation from JSON.stringify (removing `null, 2`) coupled with single-pass loops significantly improves performance for large resource lists, reducing both CPU time and payload size.
**Action:** Always prefer compact JSON serialization for LLM tool outputs and use single-pass loops for large arrays.
