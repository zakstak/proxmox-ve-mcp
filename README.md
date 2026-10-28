# Proxmox VE skills for OpenCode

This repo is now skills-first and ships a committed root `opencode.json` that
gives OpenCode a safe read-only default. The recommended install path is the
repo-local OpenCode skills in `.opencode/skills/` plus that project config; raw
MCP config stays available as a legacy opt-in.

## Quick start

Requires Node.js 24 or newer. `.node-version` selects the Node 24.22.1 security
release for development.

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

   Use a dedicated non-root user and a privilege-separated token for the default
   read-only path.

4. Open the repo in OpenCode.

   The committed `opencode.json` enables the read-only runtime by default, and
   the `proxmox-readonly` skill documents that safe path.

5. If you need admin access, first switch the MCP runtime/config to the full
   server, then use `proxmox-admin`.
   - Default safe path: `.opencode/skills/proxmox-readonly/SKILL.md` + committed
     `opencode.json`
   - Opt-in elevated path: `dist/index.js` via a local override or the legacy
     full MCP config, then `.opencode/skills/proxmox-admin/SKILL.md`

6. If you need the runtime directly, use the matching npm script.

OpenCode repo-local skills are instructions, not a built-in MCP transport. The
transport comes from the committed `opencode.json` or any explicit MCP config
you add locally.

## Repo skills

### `proxmox-readonly`

The recommended default. Use it for monitoring, inventory, status checks, and
other non-destructive work. This repo ships a matching root `opencode.json` that
enables `dist/index-readonly.js` by default.

### `proxmox-admin`

The opt-in elevated skill. Use it only after switching the MCP runtime/config to
the full server. The skill alone does not change transport permissions; the repo
default stays read-only until you use the MCP config path in `AI_INSTALL.md` or
an equivalent local override.

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
- `list_containers`, `get_container_status`, `list_storage`,
  `get_storage_content`
- `list_snapshots`, `list_tasks`, `get_task_status`

### Full server

All 27 tools, including read and write operations.

| Category       | Read-only                                 | Write                                                                                                 |
| -------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Nodes**      | `list_nodes`, `get_node_status`           | -                                                                                                     |
| **VMs**        | `list_vms`, `get_vm_status`               | `start_vm`, `stop_vm`, `shutdown_vm`, `reboot_vm`, `suspend_vm`, `resume_vm`, `clone_vm`, `delete_vm` |
| **Containers** | `list_containers`, `get_container_status` | `start_container`, `stop_container`, `reboot_container`, `clone_container`                            |
| **Storage**    | `list_storage`, `get_storage_content`     | -                                                                                                     |
| **Snapshots**  | `list_snapshots`                          | `create_snapshot`, `rollback_snapshot`, `delete_snapshot`                                             |
| **Tasks**      | `list_tasks`, `get_task_status`           | `stop_task`                                                                                           |

## Legacy MCP config

If your client cannot load repo-local OpenCode skills, or if you want full
access, use the copy-paste MCP instructions in [AI_INSTALL.md](./AI_INSTALL.md).
That file keeps the raw MCP JSON setup for OpenCode, Claude Desktop, Cursor, and
generic MCP clients.

## Development

For local experiments, use an isolated checkout and run
`npm ci --ignore-scripts` followed by `npm test`. The tests use synthetic
credentials, an in-memory API stand-in, and a loopback HTTP fixture. They do not
require Proxmox environment variables or access a cluster. Starting either
runtime with real credentials connects it to the configured host; read-only mode
is not a cluster sandbox.

### Inventory and error contracts

`list_vms` always requests cached `/cluster/resources?type=vm` inventory once.
An explicit `node` filters those results by exact node name; omitting it lists
all visible QEMU guests. Metrics can lag current guest state. `cores` comes from
`maxcpu`, and `pid` is always `null`. Node-specific callers previously received
full node status and a PID. Removing `full` from the node endpoint would still
read guest configurations, so it would not provide the same optimization.
`get_vm_status` continues to request current status and configuration.
Permissions and availability follow the cluster-resource endpoint, with no
fallback to full node scans.

All JSON tool text uses compact serialization. Parsed fields and list order
remain the same, apart from the VM inventory changes above. Cluster VM/container
lists and snapshot lists filter and format in one pass.

Resource inputs follow Proxmox formats. VM IDs are integers from 100
through 999999999. Node names contain alphanumeric characters and internal
hyphens. Storage IDs start with a letter, end with an alphanumeric character,
and allow internal dots, underscores, and hyphens. Snapshot names start with a
letter, contain alphanumeric characters, underscores, or hyphens, and have 2 to
40 characters. Task UPIDs follow `PVE::UPID::decode`, including empty task IDs,
token identities containing `!`, and 8- or 9-digit process start times. UPIDs
are URL-encoded before entering API paths. The configured default node uses the
same node parser. Free-text descriptions and clone names retain their existing
schemas.

Errors caught by tool handlers set `isError: true` and return both readable text
and `structuredContent.error`. Its `code` is `api_error`, `validation_error`,
`network_error`, or `unexpected_error`. API errors include an HTTP `status`;
validation errors include issue paths and codes. Messages omit API URLs,
response bodies, status text, and arbitrary exception payloads. SDK
input-validation errors occur before the handler and retain the SDK's response
format. The transport-error parser covers `proxmox-api` 1.1.1's plain error
strings; an unrecognized form returns a generic error.

Clients can adopt compact JSON without changing their JSON parser. Consumers of
node-specific PID values or raw exception text need to adapt before updating the
runtime. These changes require no cluster configuration rollout. Rolling back
the runtime restores the previous inventory and error behavior.

### Checks

Git hooks use [Pragma](https://github.com/zakstak/pragma) with `prek`. Clone
Pragma to `~/.pragma`, then run `~/.pragma/install.sh --agent "$PWD"` from this
repository to install the tools and portable hooks. For a different clone
location, set `PRAGMA_HOME` or rerun that clone's installer. Run
`prek run --all-files` and `prek run --all-files --hook-stage pre-push` to check
the whole repository. This refresh was validated against Pragma commit
`67843c5075e46f2cf0a5722fc3f4e5ff52ff0fda`.

`npm test` builds and checks both MCP stdio handshakes, tool schemas, the
read-only tool boundary, and mock responses. These tests never connect to a live
Proxmox cluster or perform cluster writes.

Node.js 24 is the runtime baseline, with matching Node 24 types and Undici 8.
Node 20 reached end of life on April 30, 2026. Use a patched LTS runtime such as
the Node 24.22.1 security release pinned in `.node-version`; Node 24.0.0 is
tested only as the compatibility minimum. TypeScript stays at 6.0.3 because the
latest TypeScript ESLint parser requires `<6.1.0`. The HTTP adapter test uses
only a loopback mock to verify token headers, GET, POST, DELETE, and API errors
across the Undici upgrade.

```bash
npm run dev            # Hot reload (full server)
npm run dev:readonly   # Hot reload (read-only server)
npm run build          # Compile TypeScript
npm run typecheck      # Type checking only
npm run lint           # Project ESLint checks
npm test               # Build, unit and MCP protocol tests
npm start              # Run compiled full server
npm start:readonly     # Run compiled read-only server
```

## License

MIT
