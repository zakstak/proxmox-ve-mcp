# AI Agent Installation Guide

Copy-paste ready MCP configuration for AI assistants.

## Prerequisites

1. Clone and build the server:
```bash
git clone https://github.com/your-username/proxmox-ve-mcp.git
cd proxmox-ve-mcp
npm install
npm run build
```

2. Create Proxmox API token on your Proxmox host:
```bash
pveum user token add root@pam mcp-server --privsep 0
```

## Configuration Blocks

### Claude Desktop / Cursor / Generic MCP Client

Add to your MCP config file (e.g., `~/.config/claude/claude_desktop_config.json`):

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

### OpenCode / SSE Transport

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

## Required Replacements

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `REPLACE_WITH_ABSOLUTE_PATH` | Full path to cloned repo | `/home/user/projects` |
| `REPLACE_WITH_PROXMOX_IP` | Proxmox server IP address | `192.168.1.100` |
| `REPLACE_WITH_TOKEN_SECRET` | Token from `pveum` command | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXMOX_HOST` | Yes | - | Proxmox server IP/hostname |
| `PROXMOX_PORT` | No | `8006` | API port |
| `PROXMOX_NODE` | No | `pve` | Proxmox node name |
| `PROXMOX_TOKEN_ID` | Yes | - | API token ID (`user@realm!tokenname`) |
| `PROXMOX_TOKEN_SECRET` | Yes | - | API token secret |
| `PROXMOX_VERIFY_SSL` | No | `false` | Set `true` for valid SSL certs |

## Available Tools

After installation, these 25 tools become available:

**Nodes**: `list_nodes`, `get_node_status`

**VMs**: `list_vms`, `get_vm_status`, `start_vm`, `stop_vm`, `shutdown_vm`, `reboot_vm`, `suspend_vm`, `resume_vm`, `clone_vm`, `delete_vm`

**Containers**: `list_containers`, `get_container_status`, `start_container`, `stop_container`, `reboot_container`

**Storage**: `list_storage`, `get_storage_content`

**Snapshots**: `list_snapshots`, `create_snapshot`, `rollback_snapshot`, `delete_snapshot`

**Tasks**: `list_tasks`, `get_task_status`, `stop_task`
