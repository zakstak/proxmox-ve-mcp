# AI Agent Installation Guide

This repo is skills-first, and the committed root `opencode.json` gives OpenCode a safe read-only default. Use the repo-local OpenCode skills plus that project config when your client supports them, and fall back to the raw MCP config only if you need the legacy or full-access path.

## Recommended: repo-local OpenCode skills + root `opencode.json`

1. Clone and build the repo.

   ```bash
   git clone https://github.com/zrm625/proxmox-ve-mcp.git
   cd proxmox-ve-mcp
   npm install
   npm run build
   ```

2. Create a Proxmox API token on your Proxmox host.

   Recommended default: create a dedicated non-root user, then issue a privilege-separated token with the minimum ACLs needed. Proxmox documents `PVEAuditor` as a read-only starting point, but the exact ACLs depend on which API methods you need.

3. Export the env vars the committed project config reads.

   ```bash
   export PROXMOX_HOST=192.168.1.100
   export PROXMOX_PORT=8006
   export PROXMOX_NODE=pve
   export PROXMOX_TOKEN_ID=readonly@pam!opencode
   export PROXMOX_TOKEN_SECRET=xxx-xxx-xxx
   export PROXMOX_VERIFY_SSL=false
   ```

4. Load the skill that matches your access level.

   - Safe default: `.opencode/skills/proxmox-readonly/SKILL.md`
   - Elevated access: `.opencode/skills/proxmox-admin/SKILL.md`

5. Open OpenCode in the repo root.

   The committed root `opencode.json` enables `dist/index-readonly.js` by default, so the safe path works without any extra JSON setup.

These skills are local OpenCode instructions. They do not replace the MCP transport, and they do not embed MCP config into OpenCode core.

If you need full access, add a local override or use the legacy full MCP config below. The repository default remains read-only.

For explicit admin/full-access guidance, use a dedicated elevated token such as `root@pam` only in the full MCP path below.

## Legacy MCP config

Use this section if your client cannot load repo-local skills, if you want the old raw MCP setup, or if you want full access instead of the repo-default read-only runtime.

### OpenCode (legacy local MCP)

Add to `~/.config/opencode/opencode.json` or merge into a local override:

**Read-only (recommended for safety):**

```json
{
  "mcp": {
    "proxmox_readonly": {
      "type": "local",
      "command": ["node", "REPLACE_WITH_ABSOLUTE_PATH/proxmox-ve-mcp/dist/index-readonly.js"],
      "environment": {
        "PROXMOX_HOST": "REPLACE_WITH_PROXMOX_IP",
        "PROXMOX_PORT": "8006",
        "PROXMOX_NODE": "pve",
        "PROXMOX_TOKEN_ID": "REPLACE_WITH_READONLY_TOKEN_ID",
        "PROXMOX_TOKEN_SECRET": "REPLACE_WITH_READONLY_TOKEN_SECRET",
        "PROXMOX_VERIFY_SSL": "false"
      },
      "enabled": true
    }
  }
}
```

**Full access (can start/stop/delete VMs):**

```json
{
  "mcp": {
    "proxmox": {
      "type": "local",
      "command": ["node", "REPLACE_WITH_ABSOLUTE_PATH/proxmox-ve-mcp/dist/index.js"],
      "environment": {
        "PROXMOX_HOST": "REPLACE_WITH_PROXMOX_IP",
        "PROXMOX_PORT": "8006",
        "PROXMOX_NODE": "pve",
        "PROXMOX_TOKEN_ID": "root@pam!mcp-server",
        "PROXMOX_TOKEN_SECRET": "REPLACE_WITH_TOKEN_SECRET",
        "PROXMOX_VERIFY_SSL": "false"
      },
      "enabled": true
    }
  }
}
```

### Claude Desktop / Cursor / Generic MCP Client

Add to your MCP config file, for example `~/.config/claude/claude_desktop_config.json`:

**Read-only runtime:**

```json
{
  "mcpServers": {
    "proxmox_readonly": {
      "command": "node",
      "args": ["REPLACE_WITH_ABSOLUTE_PATH/proxmox-ve-mcp/dist/index-readonly.js"],
      "env": {
        "PROXMOX_HOST": "REPLACE_WITH_PROXMOX_IP",
        "PROXMOX_PORT": "8006",
        "PROXMOX_NODE": "pve",
        "PROXMOX_TOKEN_ID": "REPLACE_WITH_READONLY_TOKEN_ID",
        "PROXMOX_TOKEN_SECRET": "REPLACE_WITH_READONLY_TOKEN_SECRET",
        "PROXMOX_VERIFY_SSL": "false"
      }
    }
  }
}
```

**Full access runtime:**

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "node",
      "args": ["REPLACE_WITH_ABSOLUTE_PATH/proxmox-ve-mcp/dist/index.js"],
      "env": {
        "PROXMOX_HOST": "REPLACE_WITH_PROXMOX_IP",
        "PROXMOX_PORT": "8006",
        "PROXMOX_NODE": "pve",
        "PROXMOX_TOKEN_ID": "root@pam!mcp-server",
        "PROXMOX_TOKEN_SECRET": "REPLACE_WITH_TOKEN_SECRET",
        "PROXMOX_VERIFY_SSL": "false"
      }
    }
  }
}
```

## Required replacements

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `REPLACE_WITH_ABSOLUTE_PATH` | Full path to cloned repo | `/home/user/projects` |
| `REPLACE_WITH_PROXMOX_IP` | Proxmox server IP address | `192.168.1.100` |
| `REPLACE_WITH_READONLY_TOKEN_ID` | Least-privilege token ID | `readonly@pam!opencode` |
| `REPLACE_WITH_READONLY_TOKEN_SECRET` | Read-only token secret | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `REPLACE_WITH_TOKEN_SECRET` | Full-access token secret | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

## Environment variables reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXMOX_HOST` | Yes | - | Proxmox server IP or hostname |
| `PROXMOX_PORT` | No | `8006` | API port |
| `PROXMOX_NODE` | No | `pve` | Proxmox node name |
| `PROXMOX_TOKEN_ID` | Yes | - | API token ID (`user@realm!tokenname`) |
| `PROXMOX_TOKEN_SECRET` | Yes | - | API token secret |
| `PROXMOX_VERIFY_SSL` | No | `false` | Set `true` for valid SSL certs |

## Available tools

### Read-only (`index-readonly.js`)

11 tools.

**Nodes**: `list_nodes`, `get_node_status`

**VMs**: `list_vms`, `get_vm_status`

**Containers**: `list_containers`, `get_container_status`

**Storage**: `list_storage`, `get_storage_content`

**Snapshots**: `list_snapshots`

**Tasks**: `list_tasks`, `get_task_status`

### Full access (`index.js`)

16 additional write tools, for 27 total.

**VMs**: `start_vm`, `stop_vm`, `shutdown_vm`, `reboot_vm`, `suspend_vm`, `resume_vm`, `clone_vm`, `delete_vm`

**Containers**: `start_container`, `stop_container`, `reboot_container`, `clone_container`

**Snapshots**: `create_snapshot`, `rollback_snapshot`, `delete_snapshot`

**Tasks**: `stop_task`
