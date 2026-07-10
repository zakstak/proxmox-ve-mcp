# Proxmox VE skills for OpenCode

This repo is now skills-first and ships a committed root `opencode.json` that gives OpenCode a safe read-only default. The recommended install path is the repo-local OpenCode skills in `.opencode/skills/` plus that project config; raw MCP config stays available as a legacy opt-in.

## Quick start

Requires Node.js 20.19 or newer.

1. Install dependencies and build the runtime.

   ```bash
   npm install
   npm run build
   ```

2. Export the Proxmox env vars the committed OpenCode config will read.

   ```bash
   export PROXMOX_HOST=192.168.1.100
   export PROXMOX_PORT=8006
   export PROXMOX_NODE=pve
   export PROXMOX_TOKEN_ID=readonly@pam!opencode
   export PROXMOX_TOKEN_SECRET=xxx-xxx-xxx
   export PROXMOX_VERIFY_SSL=false
   ```

3. Create a Proxmox API token on your Proxmox host.

   Use a dedicated non-root user and a privilege-separated token for the default read-only path.

4. Open the repo in OpenCode.

   The committed `opencode.json` enables the read-only runtime by default, and the `proxmox-readonly` skill documents that safe path.

5. If you need admin access, first switch the MCP runtime/config to the full server, then use `proxmox-admin`.

   - Default safe path: `.opencode/skills/proxmox-readonly/SKILL.md` + committed `opencode.json`
   - Opt-in elevated path: `dist/index.js` via a local override or the legacy full MCP config, then `.opencode/skills/proxmox-admin/SKILL.md`

6. If you need the runtime directly, use the matching npm script.

OpenCode repo-local skills are instructions, not a built-in MCP transport. The transport comes from the committed `opencode.json` or any explicit MCP config you add locally.

## Repo skills

### `proxmox-readonly`

The recommended default. Use it for monitoring, inventory, status checks, and other non-destructive work. This repo ships a matching root `opencode.json` that enables `dist/index-readonly.js` by default.

### `proxmox-admin`

The opt-in elevated skill. Use it only after switching the MCP runtime/config to the full server. The skill alone does not change transport permissions; the repo default stays read-only until you use the MCP config path in `AI_INSTALL.md` or an equivalent local override.

## Environment variables

```bash
PROXMOX_HOST=192.168.1.100      # Proxmox IP or hostname
PROXMOX_PORT=8006               # API port
PROXMOX_NODE=pve                # Node name
PROXMOX_TOKEN_ID=readonly@pam!opencode
PROXMOX_TOKEN_SECRET=xxx-xxx-xxx
PROXMOX_VERIFY_SSL=false        # false for self-signed certs
```

## MCP tools (27 total)

The runtime still exposes two server modes for different security requirements.

### Read-only server

11 read-only tools for monitoring without modification capabilities:

- `list_nodes`, `get_node_status`, `list_vms`, `get_vm_status`
- `list_containers`, `get_container_status`, `list_storage`, `get_storage_content`
- `list_snapshots`, `list_tasks`, `get_task_status`

### Full server

All 27 tools, including read and write operations.

| Category | Read-only | Write |
|----------|-----------|-------|
| **Nodes** | `list_nodes`, `get_node_status` | - |
| **VMs** | `list_vms`, `get_vm_status` | `start_vm`, `stop_vm`, `shutdown_vm`, `reboot_vm`, `suspend_vm`, `resume_vm`, `clone_vm`, `delete_vm` |
| **Containers** | `list_containers`, `get_container_status` | `start_container`, `stop_container`, `reboot_container`, `clone_container` |
| **Storage** | `list_storage`, `get_storage_content` | - |
| **Snapshots** | `list_snapshots` | `create_snapshot`, `rollback_snapshot`, `delete_snapshot` |
| **Tasks** | `list_tasks`, `get_task_status` | `stop_task` |

## Legacy MCP config

If your client cannot load repo-local OpenCode skills, or if you want full access, use the copy-paste MCP instructions in [AI_INSTALL.md](./AI_INSTALL.md). That file keeps the raw MCP JSON setup for OpenCode, Claude Desktop, Cursor, and generic MCP clients.

## Development

```bash
npm run dev            # Hot reload (full server)
npm run dev:readonly   # Hot reload (read-only server)
npm run build          # Compile TypeScript
npm run typecheck      # Type checking only
npm start              # Run compiled full server
npm start:readonly     # Run compiled read-only server
```

## License

MIT
