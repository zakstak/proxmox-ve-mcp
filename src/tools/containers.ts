import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { formatBytes, formatUptime, formatPercentage, ContainerInfo, ClusterResource } from '../types.js';
import { createErrorResponse } from '../utils/error-handler.js';

export function registerContainerReadTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'list_containers',
    'List all LXC containers with status, CPU, and memory usage',
    {
      node: z.string().optional().describe('Node name'),
      all: z.boolean().optional().describe('List containers from all nodes (cluster-wide)'),
    },
    async ({ node, all }) => {
      try {
        let containers: (ContainerInfo | ClusterResource)[];

        if (all) {
          // Optimization: Fetch all containers from cluster resources if 'all' is requested
          const resources = await proxmox.cluster.resources.$get({ type: 'vm' });
          containers = (resources as unknown as ClusterResource[]).filter(
            (r) => r.type === 'lxc'
          );
        } else {
          const nodeName = node || config.node;
          containers = (await proxmox.nodes.$(nodeName).lxc.$get()) as unknown as ContainerInfo[];
        }

        const formatted = containers.map((ct) => {
          // Normalize fields between ContainerInfo and ClusterResource
          const cpus = 'cpus' in ct ? ct.cpus : (ct as ClusterResource).maxcpu;
          const nodeName = 'node' in ct ? ct.node : node || config.node;
          const type = 'type' in ct ? ct.type : 'lxc';

          return {
            vmid: ct.vmid,
            name: ct.name || `CT ${ct.vmid}`,
            status: ct.status,
            cpu: ct.cpu ? formatPercentage(ct.cpu) : 'N/A',
            cores: cpus || 'N/A',
            memory: ct.mem && ct.maxmem
              ? `${formatBytes(ct.mem)} / ${formatBytes(ct.maxmem)}`
              : 'N/A',
            uptime: ct.uptime ? formatUptime(ct.uptime) : 'N/A',
            type: type || 'lxc',
            node: nodeName,
          };
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(formatted) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'get_container_status',
    'Get detailed status and configuration of a specific container',
    {
      vmid: z.number().int().positive().describe('Container ID'),
      node: z.string().optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      const nodeName = node || config.node;
      const theNode = proxmox.nodes.$(nodeName);
      
      const [status, ctConfig] = await Promise.all([
        theNode.lxc.$(vmid).status.current.$get(),
        theNode.lxc.$(vmid).config.$get(),
      ]);

      const formatted = {
        vmid,
        name: ctConfig.hostname || `CT ${vmid}`,
        status: status.status,
        cpu: {
          usage: status.cpu ? formatPercentage(status.cpu) : 'N/A',
          cores: ctConfig.cores || 'unlimited',
        },
        memory: {
          used: status.mem ? formatBytes(status.mem) : 'N/A',
          total: status.maxmem ? formatBytes(status.maxmem) : 'N/A',
          configured: ctConfig.memory ? `${ctConfig.memory} MB` : 'N/A',
        },
        swap: {
          used: status.swap ? formatBytes(status.swap) : 'N/A',
          total: status.maxswap ? formatBytes(status.maxswap) : 'N/A',
        },
        disk: status.disk ? formatBytes(status.disk) : 'N/A',
        uptime: status.uptime ? formatUptime(status.uptime) : 'N/A',
        ostype: ctConfig.ostype || 'unknown',
        unprivileged: Boolean(ctConfig.unprivileged),
        features: ctConfig.features || '',
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(formatted) }],
      };
    }
  );
}

export function registerContainerWriteTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'start_container',
    'Start a stopped container',
    {
      vmid: z.number().int().positive().describe('Container ID'),
      node: z.string().optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      const nodeName = node || config.node;
      const taskId = await proxmox.nodes.$(nodeName).lxc.$(vmid).status.start.$post();
      
      return {
        content: [{ type: 'text', text: `Container ${vmid} start initiated. Task: ${taskId}` }],
      };
    }
  );

  server.tool(
    'stop_container',
    'Stop a running container',
    {
      vmid: z.number().int().positive().describe('Container ID'),
      node: z.string().optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      const nodeName = node || config.node;
      const taskId = await proxmox.nodes.$(nodeName).lxc.$(vmid).status.stop.$post();
      
      return {
        content: [{ type: 'text', text: `Container ${vmid} stop initiated. Task: ${taskId}` }],
      };
    }
  );

  server.tool(
    'reboot_container',
    'Reboot a running container',
    {
      vmid: z.number().int().positive().describe('Container ID'),
      node: z.string().optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      const nodeName = node || config.node;
      const taskId = await proxmox.nodes.$(nodeName).lxc.$(vmid).status.reboot.$post();
      
      return {
        content: [{ type: 'text', text: `Container ${vmid} reboot initiated. Task: ${taskId}` }],
      };
    }
  );

  server.tool(
    'clone_container',
    'Clone an existing container to create a new one',
    {
      vmid: z.number().int().positive().describe('Source Container ID'),
      newid: z.number().int().positive().optional().describe('New Container ID (auto-generated if omitted)'),
      hostname: z.string().optional().describe('Hostname for the new container'),
      node: z.string().optional().describe('Node name'),
      full: z.boolean().optional().describe('Create full clone (not linked)'),
    },
    async ({ vmid, newid, hostname, node, full }) => {
      try {
        const nodeName = node || config.node;

        let targetId = newid;
        if (!targetId) {
          targetId = await proxmox.cluster.nextid.$get();
        }

        const taskId = await proxmox.nodes.$(nodeName).lxc.$(vmid).clone.$post({
          newid: targetId,
          hostname,
          full: full,
        });

        return {
          content: [{
            type: 'text',
            text: `Container ${vmid} clone to ${targetId} initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
