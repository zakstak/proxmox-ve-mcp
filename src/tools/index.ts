import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { registerNodeReadTools } from './nodes.js';
import { registerVmReadTools, registerVmWriteTools } from './vms.js';
import { registerContainerReadTools, registerContainerWriteTools } from './containers.js';
import { registerStorageReadTools } from './storage.js';
import { registerSnapshotReadTools, registerSnapshotWriteTools } from './snapshots.js';
import { registerTaskReadTools, registerTaskWriteTools } from './tasks.js';

export function registerReadOnlyTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  registerNodeReadTools(server, proxmox, config);
  registerVmReadTools(server, proxmox, config);
  registerContainerReadTools(server, proxmox, config);
  registerStorageReadTools(server, proxmox, config);
  registerSnapshotReadTools(server, proxmox, config);
  registerTaskReadTools(server, proxmox, config);
  
  console.error('[MCP] Registered read-only Proxmox tools');
}

export function registerAllTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  registerReadOnlyTools(server, proxmox, config);
  
  registerVmWriteTools(server, proxmox, config);
  registerContainerWriteTools(server, proxmox, config);
  registerSnapshotWriteTools(server, proxmox, config);
  registerTaskWriteTools(server, proxmox, config);
  
  console.error('[MCP] Registered all Proxmox tools (read + write)');
}
