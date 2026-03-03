import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { formatBytes, formatUptime, formatPercentage } from '../types.js';
import { createErrorResponse } from '../utils/error-handler.js';

export function registerNodeReadTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'list_nodes',
    'List all nodes in the Proxmox cluster with status, CPU, and memory usage',
    {},
    async () => {
      try {
        const nodes = await proxmox.nodes.$get();

        const formatted = nodes.map((node) => ({
          name: node.node,
          status: node.status || 'unknown',
          cpu: node.cpu ? formatPercentage(node.cpu) : 'N/A',
          cores: node.maxcpu || 'N/A',
          memory: node.mem && node.maxmem
            ? `${formatBytes(node.mem)} / ${formatBytes(node.maxmem)}`
            : 'N/A',
          memoryPercent: node.mem && node.maxmem
            ? formatPercentage(node.mem / node.maxmem)
            : 'N/A',
          uptime: node.uptime ? formatUptime(node.uptime) : 'N/A',
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(formatted)
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'get_node_status',
    'Get detailed status of a specific node including CPU, memory, network, and disk usage',
    {
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name (defaults to configured node)'),
    },
    async ({ node }) => {
      try {
        const nodeName = node || config.node;
        const status = await proxmox.nodes.$(nodeName).status.$get();

        const formatted = {
          node: nodeName,
          status: 'online',
          cpu: {
            usage: status.cpu ? formatPercentage(status.cpu) : 'N/A',
            cores: status.cpuinfo?.cpus || 'N/A',
            model: status.cpuinfo?.model || 'N/A',
            sockets: status.cpuinfo?.sockets || 'N/A',
          },
          memory: {
            used: status.memory?.used ? formatBytes(status.memory.used) : 'N/A',
            total: status.memory?.total ? formatBytes(status.memory.total) : 'N/A',
            free: status.memory?.free ? formatBytes(status.memory.free) : 'N/A',
            usagePercent: status.memory?.used && status.memory?.total
              ? formatPercentage(status.memory.used / status.memory.total)
              : 'N/A',
          },
          swap: {
            used: status.swap?.used ? formatBytes(status.swap.used) : 'N/A',
            total: status.swap?.total ? formatBytes(status.swap.total) : 'N/A',
          },
          uptime: status.uptime ? formatUptime(status.uptime) : 'N/A',
          loadAverage: status.loadavg || [],
          kernelVersion: status.kversion || 'N/A',
          pveVersion: status.pveversion || 'N/A',
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(formatted)
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
