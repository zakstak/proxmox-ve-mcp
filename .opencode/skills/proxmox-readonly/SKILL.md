---
name: proxmox-readonly
description: Default safe OpenCode skill for read-only Proxmox VE control through this repo's local MCP runtime.
---

# Proxmox read-only skill

Use this skill when you want safer day-to-day access to a Proxmox VE host.

It is the recommended default because it stays in inspection and monitoring territory, with no destructive actions, and the repo ships a matching root `opencode.json` that enables the read-only runtime by default.

This skill depends on this repository's built runtime, especially `dist/index-readonly.js`, plus the same Proxmox connection env vars used by the server: `PROXMOX_HOST`, `PROXMOX_PORT`, `PROXMOX_NODE`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`, and `PROXMOX_VERIFY_SSL`.

Before use, install dependencies and build the project with `npm install` and `npm run build`, then load this repo-local skill in OpenCode.

If your client only supports raw MCP JSON config, or you want the legacy or full-access setup, see `AI_INSTALL.md`.

Keep requests within read-only tasks such as listing, checking status, and reviewing task output.
