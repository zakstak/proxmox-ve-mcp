import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProxmoxClient } from '../proxmox-client.js';
import type { Config } from '../config.js';
import { formatBytes, formatUptime, formatPercentage } from '../types.js';
import { createErrorResponse } from '../utils/error-handler.js';

export function registerVmReadTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'list_vms',
    'List all QEMU virtual machines with status, CPU, and memory usage. Lists across all nodes when no node is specified.',
    {
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name (omit to list across all nodes)'),
    },
    async ({ node }) => {
      try {
        if (node) {
          const vms = await proxmox.nodes.$(node).qemu.$get({ full: true });

          const formatted = vms.map((vm) => ({
            vmid: vm.vmid,
            name: vm.name || `VM ${vm.vmid}`,
            status: vm.status,
            node,
            cpu: vm.cpu ? formatPercentage(vm.cpu) : 'N/A',
            cores: vm.cpus || 'N/A',
            memory: vm.mem && vm.maxmem
              ? `${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}`
              : 'N/A',
            uptime: vm.uptime ? formatUptime(vm.uptime) : 'N/A',
            pid: vm.pid || null,
          }));

          return {
            content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
          };
        }

        const resources = await proxmox.cluster.resources.$get({ type: 'vm' });

        const formatted = resources
          .filter((r) => r.type === 'qemu')
          .map((r) => ({
            vmid: r.vmid!,
            name: r.name || `VM ${r.vmid}`,
            status: r.status || 'unknown',
            node: r.node || 'unknown',
            cpu: r.cpu ? formatPercentage(r.cpu) : 'N/A',
            cores: r.maxcpu || 'N/A',
            memory: r.mem && r.maxmem
              ? `${formatBytes(r.mem)} / ${formatBytes(r.maxmem)}`
              : 'N/A',
            uptime: r.uptime ? formatUptime(r.uptime) : 'N/A',
            pid: null,
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
    'get_vm_status',
    'Get detailed status and configuration of a specific VM',
    {
      vmid: z.number().int().positive().describe('VM ID'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      try {
        const nodeName = node || config.node;
        const theNode = proxmox.nodes.$(nodeName);

        const [status, vmConfig] = await Promise.all([
          theNode.qemu.$(vmid).status.current.$get(),
          theNode.qemu.$(vmid).config.$get(),
        ]);

        const formatted = {
          vmid,
          name: vmConfig.name || `VM ${vmid}`,
          status: status.status,
          cpu: {
            usage: status.cpu ? formatPercentage(status.cpu) : 'N/A',
            cores: vmConfig.cores || 1,
            sockets: vmConfig.sockets || 1,
          },
          memory: {
            used: status.mem ? formatBytes(status.mem) : 'N/A',
            total: status.maxmem ? formatBytes(status.maxmem) : 'N/A',
            configured: vmConfig.memory ? `${vmConfig.memory} MB` : 'N/A',
          },
          disk: status.disk ? formatBytes(status.disk) : 'N/A',
          uptime: status.uptime ? formatUptime(status.uptime) : 'N/A',
          network: {
            in: status.netin ? formatBytes(status.netin) : 'N/A',
            out: status.netout ? formatBytes(status.netout) : 'N/A',
          },
          qemuAgent: Boolean(status.agent),
          machine: vmConfig.machine || 'default',
          bios: vmConfig.bios || 'seabios',
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}

export function registerVmWriteTools(
  server: McpServer,
  proxmox: ProxmoxClient,
  config: Config
): void {
  server.tool(
    'start_vm',
    'Start a stopped virtual machine',
    {
      vmid: z.number().int().positive().describe('VM ID to start'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      try {
        const nodeName = node || config.node;
        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).status.start.$post();

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} start initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'stop_vm',
    'Stop a running virtual machine (graceful ACPI shutdown)',
    {
      vmid: z.number().int().positive().describe('VM ID to stop'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
      timeout: z.number().int().optional().describe('Timeout in seconds'),
    },
    async ({ vmid, node, timeout }) => {
      try {
        const nodeName = node || config.node;
        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).status.stop.$post({
          timeout: timeout || 60,
        });

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} stop initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'shutdown_vm',
    'Gracefully shutdown a VM via ACPI, optionally force stop if timeout exceeded',
    {
      vmid: z.number().int().positive().describe('VM ID'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
      forceStop: z.boolean().optional().describe('Force stop after timeout'),
      timeout: z.number().int().optional().describe('Timeout in seconds'),
    },
    async ({ vmid, node, forceStop, timeout }) => {
      try {
        const nodeName = node || config.node;
        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).status.shutdown.$post({
          forceStop: forceStop,
          timeout: timeout || 60,
        });

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} shutdown initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'reboot_vm',
    'Reboot a running virtual machine',
    {
      vmid: z.number().int().positive().describe('VM ID'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      try {
        const nodeName = node || config.node;
        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).status.reboot.$post();

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} reboot initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'suspend_vm',
    'Suspend a running VM to RAM',
    {
      vmid: z.number().int().positive().describe('VM ID'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      try {
        const nodeName = node || config.node;
        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).status.suspend.$post();

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} suspend initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'resume_vm',
    'Resume a suspended VM',
    {
      vmid: z.number().int().positive().describe('VM ID'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
    },
    async ({ vmid, node }) => {
      try {
        const nodeName = node || config.node;
        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).status.resume.$post();

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} resume initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'clone_vm',
    'Clone an existing VM to create a new one',
    {
      vmid: z.number().int().positive().describe('Source VM ID'),
      newid: z.number().int().positive().optional().describe('New VM ID (auto-generated if omitted)'),
      name: z.string().regex(/^[a-zA-Z0-9_.-]+$/).optional().describe('Name for the new VM'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
      full: z.boolean().optional().describe('Create full clone (not linked)'),
    },
    async ({ vmid, newid, name, node, full }) => {
      try {
        const nodeName = node || config.node;

        let targetId = newid;
        if (!targetId) {
          targetId = await proxmox.cluster.nextid.$get();
        }

        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).clone.$post({
          newid: targetId,
          name,
          full: full,
        });

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} clone to ${targetId} initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.tool(
    'delete_vm',
    'Delete a virtual machine (must be stopped)',
    {
      vmid: z.number().int().positive().describe('VM ID to delete'),
      node: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Node name'),
      purge: z.boolean().optional().describe('Remove from backup jobs and HA'),
    },
    async ({ vmid, node, purge }) => {
      try {
        const nodeName = node || config.node;
        const taskId = await proxmox.nodes.$(nodeName).qemu.$(vmid).$delete({
          purge: purge,
        });

        return {
          content: [{
            type: 'text',
            text: `VM ${vmid} deletion initiated. Task: ${taskId}`
          }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
