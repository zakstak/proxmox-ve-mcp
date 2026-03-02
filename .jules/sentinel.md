## 2024-05-20 - [Add Strict Regex Validation for Resource IDs]
**Vulnerability:** User inputs for Proxmox identifiers like `node`, `snapname`, `storage`, `upid`, `name`, and `hostname` were validated only as `z.string()`, allowing arbitrary characters.
**Learning:** These inputs are directly passed to API endpoints and path parameters without further validation, which creates path traversal and API injection vulnerabilities. Specifically, Proxmox APIs expect strictly formatted identifiers.
**Prevention:** Use Zod's `.regex()` to strictly limit input characters to alphanumeric and standard separators (`-`, `_`, `.`, etc.) depending on the specific resource type. Never allow completely unconstrained strings to be used as resource IDs or paths.
