import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { createErrorResponse } from '../utils/error-handler.js';

export function registerSnapshotReadTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'list_snapshots',
    'List all snapshots for a VM or container',
    {
      vmid: z.number().int().positive().describe('VM or container ID'),
      type: z.enum(['qemu', 'lxc']).default('qemu').describe('Resource type'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, type, node }) => {
      try {
        const nodeName = node || config.node;
        const theNode = proxmox.nodes.$(nodeName);
      
        const snapshots = type === 'qemu'
          ? await theNode.qemu.$(vmid).snapshot.$get()
          : await theNode.lxc.$(vmid).snapshot.$get();
      
        const formatted = snapshots
          .filter((s) => s.name !== 'current')
          .map((s) => ({
            name: s.name,
            description: s.description || '',
            time: s.snaptime ? new Date(s.snaptime * 1000).toISOString() : null,
            vmstate: s.vmstate === 1,
            parent: s.parent || null,
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

export function registerSnapshotWriteTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'create_snapshot',
    'Create a snapshot of a VM or container',
    {
      vmid: z.number().int().positive().describe('VM or container ID'),
      snapname: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe('Snapshot name'),
      description: z.string().regex(/^[^<>'"]*$/).optional().describe('Snapshot description'),
      vmstate: z.boolean().optional().describe('Include VM RAM state'),
      type: z.enum(['qemu', 'lxc']).default('qemu').describe('Resource type'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, snapname, description, vmstate, type, node }) => {
      try {
        const nodeName = node || config.node;
        const theNode = proxmox.nodes.$(nodeName);
      
        const taskId = type === 'qemu'
          ? await theNode.qemu.$(vmid).snapshot.$post({
              snapname,
              description,
              vmstate: vmstate,
            })
          : await theNode.lxc.$(vmid).snapshot.$post({
              snapname,
              description,
            });
      
        return {
          content: [{ 
            type: 'text', 
            text: `Snapshot '${snapname}' creation initiated for ${type} ${vmid}. Task: ${taskId}` 
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'rollback_snapshot',
    'Rollback a VM or container to a snapshot',
    {
      vmid: z.number().int().positive().describe('VM or container ID'),
      snapname: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe('Snapshot name to rollback to'),
      type: z.enum(['qemu', 'lxc']).default('qemu').describe('Resource type'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, snapname, type, node }) => {
      try {
        const nodeName = node || config.node;
        const theNode = proxmox.nodes.$(nodeName);
      
        const taskId = type === 'qemu'
          ? await theNode.qemu.$(vmid).snapshot.$(snapname).rollback.$post()
          : await theNode.lxc.$(vmid).snapshot.$(snapname).rollback.$post();
      
        return {
          content: [{ 
            type: 'text', 
            text: `Rollback to '${snapname}' initiated for ${type} ${vmid}. Task: ${taskId}` 
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'delete_snapshot',
    'Delete a snapshot from a VM or container',
    {
      vmid: z.number().int().positive().describe('VM or container ID'),
      snapname: z.string().regex(/^[a-zA-Z0-9_-]+$/).describe('Snapshot name to delete'),
      type: z.enum(['qemu', 'lxc']).default('qemu').describe('Resource type'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, snapname, type, node }) => {
      try {
        const nodeName = node || config.node;
        const theNode = proxmox.nodes.$(nodeName);
      
        const taskId = type === 'qemu'
          ? await theNode.qemu.$(vmid).snapshot.$(snapname).$delete()
          : await theNode.lxc.$(vmid).snapshot.$(snapname).$delete();
      
        return {
          content: [{ 
            type: 'text', 
            text: `Snapshot '${snapname}' deletion initiated for ${type} ${vmid}. Task: ${taskId}` 
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
