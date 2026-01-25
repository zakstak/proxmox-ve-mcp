# Proxmox VE MCP Server

MCP (Model Context Protocol) server for managing Proxmox VE hypervisors. Enables AI assistants to control VMs, containers, storage, and snapshots.

## Quick Start

```bash
npm install

# Configure
cp .env.example .env
# Edit .env with your Proxmox credentials

# Run
npm run dev
```

## Create API Token

On your Proxmox host:

```bash
pveum user token add root@pam mcp-server --privsep 0
# Copy the token secret to .env
```

## Environment Variables

```bash
PROXMOX_HOST=192.168.1.100      # Proxmox IP
PROXMOX_PORT=8006               # API port
PROXMOX_NODE=pve                # Node name
PROXMOX_TOKEN_ID=root@pam!mcp-server
PROXMOX_TOKEN_SECRET=xxx-xxx-xxx
PROXMOX_VERIFY_SSL=false        # false for self-signed certs
```

## MCP Tools (25 total)

| Category | Tools |
|----------|-------|
| **Nodes** | `list_nodes`, `get_node_status` |
| **VMs** | `list_vms`, `get_vm_status`, `start_vm`, `stop_vm`, `shutdown_vm`, `reboot_vm`, `suspend_vm`, `resume_vm`, `clone_vm`, `delete_vm` |
| **Containers** | `list_containers`, `get_container_status`, `start_container`, `stop_container`, `reboot_container` |
| **Storage** | `list_storage`, `get_storage_content` |
| **Snapshots** | `list_snapshots`, `create_snapshot`, `rollback_snapshot`, `delete_snapshot` |
| **Tasks** | `list_tasks`, `get_task_status`, `stop_task` |

## MCP Client Configuration

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "node",
      "args": ["/path/to/proxmox-ve-mcp/dist/index.js"],
      "env": {
        "PROXMOX_HOST": "192.168.1.100",
        "PROXMOX_TOKEN_ID": "root@pam!mcp-server",
        "PROXMOX_TOKEN_SECRET": "your-token"
      }
    }
  }
}
```

## Development

```bash
npm run dev       # Hot reload
npm run build     # Compile TypeScript
npm run typecheck # Type checking only
npm start         # Run compiled version
```

## License

MIT
