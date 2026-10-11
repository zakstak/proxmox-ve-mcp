import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import proxmoxApi from "proxmox-api";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { registerReadOnlyTools } from "../dist/tools/index.js";
import { formatBytes, formatPercentage, formatUptime } from "../dist/types.js";
import { createFetch } from "../dist/utils/http-client.js";
import {
  createErrorResponse,
  getErrorMessage,
} from "../dist/utils/error-handler.js";

const config = {
  host: "127.0.0.1",
  port: 1,
  node: "test-node",
  tokenId: "readonly@pam!test",
  tokenSecret: "00000000-0000-0000-0000-000000000000",
  verifySsl: true,
};
const readOnlyTools = [
  "list_nodes",
  "get_node_status",
  "list_vms",
  "get_vm_status",
  "list_containers",
  "get_container_status",
  "list_storage",
  "get_storage_content",
  "list_snapshots",
  "list_tasks",
  "get_task_status",
].sort();

for (const [entry, name, toolCount] of [
  ["index-readonly.js", "proxmox-ve-mcp-readonly", 11],
  ["index.js", "proxmox-ve-mcp", 27],
]) {
  test(`${entry}: stdio handshake and published tool schemas`, async (t) => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [`dist/${entry}`],
      stderr: "pipe",
      env: {
        PROXMOX_HOST: config.host,
        PROXMOX_PORT: String(config.port),
        PROXMOX_NODE: config.node,
        PROXMOX_TOKEN_ID: config.tokenId,
        PROXMOX_TOKEN_SECRET: config.tokenSecret,
        PROXMOX_VERIFY_SSL: String(config.verifySsl),
      },
    });
    const client = new Client({ name: "protocol-test", version: "1.0.0" });
    t.after(() => client.close());
    await client.connect(transport);
    assert.equal(client.getServerVersion().name, name);
    const { tools } = await client.listTools();
    assert.equal(tools.length, toolCount);
    for (const tool of tools) {
      assert.equal(tool.inputSchema.type, "object");
      assert.ok(tool.description);
    }
    if (entry === "index-readonly.js") {
      assert.deepEqual(tools.map((tool) => tool.name).sort(), readOnlyTools);
      const denied = await client.callTool({
        name: "start_vm",
        arguments: { vmid: 100 },
      });
      assert.equal(denied.isError, true);
    } else {
      const startVm = tools.find((tool) => tool.name === "start_vm");
      assert.ok(startVm.inputSchema.required.includes("vmid"));
      assert.equal(startVm.inputSchema.properties.vmid.type, "integer");
    }
    // Listing schemas never calls the Proxmox API; this fixture host has no service.
  });
}

test("read-only tool calls format mock responses and reject invalid schemas", async (t) => {
  const server = new McpServer({ name: "mock-proxmox", version: "1.0.0" });
  let calls = 0;
  registerReadOnlyTools(
    server,
    {
      nodes: {
        $get: async () => {
          calls += 1;
          return [
            {
              node: "test-node",
              status: "online",
              cpu: 0.5,
              maxcpu: 4,
              mem: 1024,
              maxmem: 2048,
              uptime: 3600,
            },
          ];
        },
      },
    },
    config,
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "tool-test", version: "1.0.0" });
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const result = await client.callTool({ name: "list_nodes", arguments: {} });
  assert.deepEqual(JSON.parse(result.content[0].text), [
    {
      name: "test-node",
      status: "online",
      cpu: "50.0%",
      cores: 4,
      memory: "1.0 KB / 2.0 KB",
      memoryPercent: "50.0%",
      uptime: "1h 0m",
    },
  ]);
  const invalid = await client.callTool({
    name: "get_vm_status",
    arguments: { vmid: "invalid" },
  });
  assert.equal(invalid.isError, true);
  assert.equal(calls, 1);
});

test("formatters and error responses retain their public output", () => {
  assert.equal(formatBytes(0), "0.0 B");
  assert.equal(formatBytes(1024 ** 3), "1.0 GB");
  assert.equal(formatUptime(90060), "1d 1h");
  assert.equal(formatPercentage(0.125), "12.5%");
  assert.deepEqual(createErrorResponse(new Error("offline")), {
    content: [{ type: "text", text: "Error: offline" }],
    isError: true,
  });
  const validation = z.object({ vmid: z.number() }).safeParse({ vmid: "bad" });
  assert.match(getErrorMessage(validation.error), /^Validation Error:/);
  const apiError = Object.assign(new Error("failed"), {
    response: {
      status: 403,
      statusText: "Forbidden",
      data: { message: "permission denied" },
    },
  });
  assert.equal(
    getErrorMessage(apiError),
    'Proxmox API Error 403 Forbidden: {"message":"permission denied"}',
  );
});

test("Undici adapter retains Proxmox token auth and API error behavior", async (t) => {
  const requests = [];
  const mock = createServer((request, response) => {
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
    });
    response.setHeader("Content-Type", "application/json;charset=UTF-8");
    if (requests.length === 1) {
      response.end(JSON.stringify({ data: [{ node: "mock-node" }] }));
    } else {
      response.statusCode = 403;
      response.end(JSON.stringify({ errors: "fixture permission denied" }));
    }
  });
  t.after(
    () =>
      new Promise((resolve, reject) => {
        mock.close((error) => (error ? reject(error) : resolve()));
        mock.closeAllConnections();
      }),
  );
  mock.listen(0, "127.0.0.1");
  await once(mock, "listening");
  // HTTP is confined to the local mock. Production defaults remain HTTPS.
  const proxmox = proxmoxApi({
    host: "127.0.0.1",
    port: mock.address().port,
    schema: "http",
    tokenID: config.tokenId,
    tokenSecret: config.tokenSecret,
    fetch: createFetch(true),
  });
  assert.deepEqual(await proxmox.nodes.$get(), [{ node: "mock-node" }]);
  await assert.rejects(
    proxmox.nodes.$get(),
    /403 Forbidden.*fixture permission denied/,
  );
  assert.deepEqual(
    requests,
    Array(2).fill({
      method: "GET",
      url: "/api2/json/nodes",
      authorization: `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
    }),
  );
});
