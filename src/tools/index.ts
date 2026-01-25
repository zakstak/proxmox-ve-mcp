import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { registerNodeTools } from './nodes.js';
import { registerVmTools } from './vms.js';
import { registerContainerTools } from './containers.js';
import { registerStorageTools } from './storage.js';
import { registerSnapshotTools } from './snapshots.js';
import { registerTaskTools } from './tasks.js';

export function registerAllTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  registerNodeTools(server, proxmox, config);
  registerVmTools(server, proxmox, config);
  registerContainerTools(server, proxmox, config);
  registerStorageTools(server, proxmox, config);
  registerSnapshotTools(server, proxmox, config);
  registerTaskTools(server, proxmox, config);
  
  console.error('[MCP] Registered all Proxmox tools');
}
