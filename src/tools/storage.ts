import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { formatBytes, formatPercentage } from '../types.js';
import { createErrorResponse } from '../utils/error-handler.js';

export function registerStorageReadTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'list_storage',
    'List all storage pools with usage and status',
    {
      node: z.string().optional().describe('Node name'),
    },
    async ({ node }) => {
      try {
        const nodeName = node || config.node;
        const storage = await proxmox.nodes.$(nodeName).storage.$get();

        const formatted = storage.map((s) => ({
          name: s.storage,
          type: s.type,
          content: s.content,
          active: Boolean(s.active),
          enabled: Boolean(s.enabled),
          shared: Boolean(s.shared),
          total: s.total ? formatBytes(s.total) : 'N/A',
          used: s.used ? formatBytes(s.used) : 'N/A',
          available: s.avail ? formatBytes(s.avail) : 'N/A',
          usagePercent: s.used_fraction ? formatPercentage(s.used_fraction) : 'N/A',
        }));

        return {
          content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'get_storage_content',
    'List content of a storage pool (ISOs, disk images, templates)',
    {
      storage: z.string().describe('Storage name'),
      node: z.string().optional().describe('Node name'),
      content: z.string().optional().describe('Filter by content type (images, iso, vztmpl, backup)'),
    },
    async ({ storage, node, content }) => {
      try {
        const nodeName = node || config.node;
        const items = await proxmox.nodes.$(nodeName).storage.$(storage).content.$get({
          content,
        });

        const formatted = items.map((item) => ({
          volid: item.volid,
          format: item.format,
          size: item.size ? formatBytes(item.size) : 'N/A',
          content: item.content,
          vmid: item.vmid || null,
          notes: item.notes || null,
          ctime: item.ctime ? new Date(item.ctime * 1000).toISOString() : null,
        }));

        return {
          content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
