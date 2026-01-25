import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { createProxmoxClient } from './proxmox-client.js';
import { registerAllTools } from './tools/index.js';

async function main() {
  const config = loadConfig();
  const proxmox = createProxmoxClient(config);
  
  const server = new McpServer({
    name: 'proxmox-ve-mcp',
    version: '1.0.0',
  });

  registerAllTools(server, proxmox, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[MCP] Proxmox VE MCP server running on stdio');
}

main().catch((err) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});
