---
name: proxmox-admin
description: Opt-in elevated OpenCode skill for full Proxmox VE control with this repo's local MCP runtime.
---

# Proxmox admin skill

Use this skill only when you explicitly need write access.

It is the elevated option and can start, stop, clone, delete, or modify Proxmox resources, so treat it as an opt-in path. Loading this skill does not replace the repo-default read-only transport; the committed root `opencode.json` still points at `dist/index-readonly.js` until you switch the MCP runtime/config to `dist/index.js` with a local override or the full path in `AI_INSTALL.md`.

This skill depends on this repository's built runtime, especially `dist/index.js`, plus the same Proxmox connection env vars used by the server: `PROXMOX_HOST`, `PROXMOX_PORT`, `PROXMOX_NODE`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`, and `PROXMOX_VERIFY_SSL`.

Before use, install dependencies and build the project with `npm install` and `npm run build`, then load this repo-local skill in OpenCode.

If your client does not support repo-local skills, or if you want to enable full access instead of the default read-only runtime, use the full MCP config path in `AI_INSTALL.md` or an equivalent local override.

Keep the scope narrow, confirm destructive actions, and prefer the read-only skill unless you truly need writes.
