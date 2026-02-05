import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { createErrorResponse } from '../utils/error-handler.js';

export function registerTaskReadTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'list_tasks',
    'List recent tasks on a node',
    {
      node: z.string().optional().describe('Node name'),
      limit: z.number().int().min(1).max(100).optional().describe('Max tasks to return'),
      vmid: z.number().int().optional().describe('Filter by VM/CT ID'),
    },
    async ({ node, limit, vmid }) => {
      try {
        const nodeName = node || config.node;
        const tasks = await proxmox.nodes.$(nodeName).tasks.$get({
          limit: limit || 20,
          vmid,
        });

        const formatted = tasks.map((task) => ({
          upid: task.upid,
          type: task.type,
          id: task.id || null,
          user: task.user,
          status: task.status || 'running',
          startTime: new Date(task.starttime * 1000).toISOString(),
          endTime: task.endtime ? new Date(task.endtime * 1000).toISOString() : null,
          node: task.node,
        }));

        return {
          content: [{ type: 'text', text: JSON.stringify(formatted) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'get_task_status',
    'Get status and log of a specific task',
    {
      upid: z.string().describe('Task UPID (unique task ID)'),
      node: z.string().optional().describe('Node name'),
    },
    async ({ upid, node }) => {
      try {
        const nodeName = node || config.node;

        const [status, log] = await Promise.all([
          proxmox.nodes.$(nodeName).tasks.$(upid).status.$get(),
          proxmox.nodes.$(nodeName).tasks.$(upid).log.$get({ limit: 50 }),
        ]);

        const formatted = {
          upid,
          type: status.type,
          status: status.status,
          exitstatus: status.exitstatus || null,
          startTime: status.starttime ? new Date(status.starttime * 1000).toISOString() : null,
          endTime: status.endtime ? new Date(status.endtime * 1000).toISOString() : null,
          user: status.user,
          node: status.node,
          log: log.map((l) => l.t).join('\n'),
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(formatted) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}

export function registerTaskWriteTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'stop_task',
    'Attempt to stop a running task',
    {
      upid: z.string().describe('Task UPID'),
      node: z.string().optional().describe('Node name'),
    },
    async ({ upid, node }) => {
      try {
        const nodeName = node || config.node;
        await proxmox.nodes.$(nodeName).tasks.$(upid).$delete();

        return {
          content: [{ type: 'text', text: `Stop signal sent to task ${upid}` }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
