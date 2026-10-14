import process from "node:process";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { URL } from "node:url";
import proxmoxApi from "proxmox-api";
import { Response } from "undici";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerAllTools } from "../dist/tools/index.js";
import { createErrorResponse } from "../dist/utils/error-handler.js";
import {
  nodeNameSchema,
  storageIdSchema,
  snapshotNameSchema,
  taskUpidSchema,
  vmIdSchema,
} from "../dist/utils/resource-schemas.js";

const config = {
  host: "fixture.invalid",
  port: 8006,
  node: "pve-1",
  tokenId: "readonly@pam!fixture",
  tokenSecret: "00000000-0000-0000-0000-000000000000",
  verifySsl: true,
};
const upid =
  "UPID:pve-1:00000001:123456789:00000003:qmstart:100:readonly@pam!fixture:";

async function fixture(t, respond) {
  const calls = [];
  const proxmox = proxmoxApi({
    host: config.host,
    tokenID: config.tokenId,
    tokenSecret: config.tokenSecret,
    fetch: async (url, init) => {
      const request = {
        method: init.method,
        url: new URL(url),
        body: init.body,
      };
      calls.push(request);
      const { data, status = 200 } = respond(request);
      return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json;charset=UTF-8" },
      });
    },
  });
  const server = new McpServer({ name: "mock-proxmox", version: "1.0.0" });
  registerAllTools(server, proxmox, config);
  const client = new Client({ name: "residual-test", version: "1.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(b);
  await client.connect(a);
  return {
    calls,
    client,
    call: (name, args = {}) => client.callTool({ name, arguments: args }),
  };
}

function compactResult(result) {
  assert.equal(result.isError, undefined);
  const text = result.content[0].text;
  const data = JSON.parse(text);
  assert.equal(text, JSON.stringify(data));
  return data;
}

test("VM inventory uses one cached request with optional exact node filtering", async (t) => {
  const resources = [
    {
      type: "qemu",
      vmid: 101,
      node: "pve-1",
      name: 'A "VM"',
      status: "running",
      cpu: 0.25,
      maxcpu: 4,
      mem: 1024,
      maxmem: 2048,
      uptime: 3600,
    },
    { type: "lxc", vmid: 102, node: "pve-1" },
    { type: "qemu", vmid: 103, node: "pve-2" },
    { type: "node", node: "pve-1" },
  ];
  const f = await fixture(t, ({ url }) => {
    assert.equal(url.pathname, "/api2/json/cluster/resources");
    assert.equal(url.search, "?type=vm");
    return { data: { data: resources } };
  });
  const all = compactResult(await f.call("list_vms"));
  assert.deepEqual(
    all.map((r) => r.vmid),
    [101, 103],
  );
  assert.deepEqual(all[0], {
    vmid: 101,
    name: 'A "VM"',
    status: "running",
    node: "pve-1",
    cpu: "25.0%",
    cores: 4,
    memory: "1.0 KB / 2.0 KB",
    uptime: "1h 0m",
    pid: null,
  });
  assert.deepEqual(compactResult(await f.call("list_vms", { node: "pve-1" })), [
    all[0],
  ]);
  assert.deepEqual(
    compactResult(await f.call("list_vms", { node: "missing" })),
    [],
  );
  assert.equal(f.calls.length, 3);
  resources.length = 0;
  assert.deepEqual(compactResult(await f.call("list_vms")), []);
});

test("containers preserve node routes and cluster filtering; snapshots omit current", async (t) => {
  const f = await fixture(t, ({ url }) => {
    if (url.pathname === "/api2/json/cluster/resources")
      return {
        data: {
          data: [
            { type: "qemu", vmid: 100 },
            { type: "lxc", vmid: 101, node: "pve-2" },
            { type: "lxc", vmid: 102, node: "pve-1" },
          ],
        },
      };
    if (url.pathname === "/api2/json/nodes/pve-1/lxc")
      return { data: { data: [{ vmid: 102, status: "stopped" }] } };
    assert.equal(url.pathname, "/api2/json/nodes/pve-1/qemu/100/snapshot");
    return {
      data: {
        data: [
          { name: "current" },
          { name: "before", description: 'quote " and\nnewline', snaptime: 1 },
          { name: "after" },
        ],
      },
    };
  });
  assert.deepEqual(
    compactResult(await f.call("list_containers")).map((r) => r.vmid),
    [101, 102],
  );
  assert.equal(
    compactResult(await f.call("list_containers", { node: "pve-1" }))[0].vmid,
    102,
  );
  const snapshots = compactResult(
    await f.call("list_snapshots", { vmid: 100 }),
  );
  assert.deepEqual(
    snapshots.map((s) => s.name),
    ["before", "after"],
  );
  assert.equal(snapshots[0].description, 'quote " and\nnewline');
  assert.equal(f.calls.length, 3);
});

test("resource schemas retain supported punctuation and numeric bounds", () => {
  for (const value of ["pve", "pve-1", "7"])
    assert.equal(nodeNameSchema.parse(value), value);
  for (const value of ["local", "pool.1", "pool_name-2"])
    assert.equal(storageIdSchema.parse(value), value);
  assert.equal(snapshotNameSchema.parse("before-1_2"), "before-1_2");
  assert.equal(taskUpidSchema.parse(upid), upid);
  assert.equal(
    taskUpidSchema.parse(upid.replace(":100:", ":id%?#\\x:")),
    upid.replace(":100:", ":id%?#\\x:"),
  );
  assert.equal(
    taskUpidSchema.parse(upid.replace(":100:", "::")),
    upid.replace(":100:", "::"),
  );
  for (const value of [100, 999999999])
    assert.equal(vmIdSchema.parse(value), value);
  for (const [schema, values] of [
    [
      nodeNameSchema,
      ["", "../pve", "pve/name", "pve_1", "pve\n", "pve?x", "pve%2f1"],
    ],
    [storageIdSchema, ["x", "1pool", "pool/1", "pool#1", "pool-", "pool\n"]],
    [
      snapshotNameSchema,
      ["x", "1before", "a".repeat(41), "snap/name", "snap\n"],
    ],
    [
      taskUpidSchema,
      ["anything", upid.replace("qmstart", "qm/start"), upid + "\n"],
    ],
    [vmIdSchema, [1, 99, 1000000000, 100.5]],
  ])
    for (const value of values)
      assert.equal(schema.safeParse(value).success, false, String(value));
});

test("every published resource input rejects invalid values before any API request", async (t) => {
  const f = await fixture(t, () => {
    throw new Error("Unexpected API request");
  });
  const { tools } = await f.client.listTools();
  for (const tool of tools) {
    const props = tool.inputSchema.properties;
    const args = {};
    if (props.vmid) args.vmid = 100;
    if (props.storage) args.storage = "local";
    if (props.snapname) args.snapname = "before";
    if (props.upid) args.upid = upid;
    for (const [field, invalid] of [
      ["node", "../pve"],
      ["vmid", 99],
      ["newid", 1000000000],
      ["storage", "bad/pool"],
      ["snapname", "bad/snap"],
      ["upid", "bad/task"],
    ]) {
      if (props[field])
        assert.equal(
          (await f.call(tool.name, { ...args, [field]: invalid })).isError,
          true,
          `${tool.name}.${field}`,
        );
    }
  }
  assert.equal(f.calls.length, 0);
});

test("supported storage and task identifiers reach the expected literal API routes", async (t) => {
  const f = await fixture(t, ({ url }) => ({
    data: {
      data: url.pathname.endsWith("/status") ? { status: "stopped" } : [],
    },
  }));
  compactResult(await f.call("get_storage_content", { storage: "pool.1" }));
  compactResult(await f.call("get_task_status", { upid }));
  assert.deepEqual(
    f.calls.map(({ url }) => url.pathname),
    [
      "/api2/json/nodes/pve-1/storage/pool.1/content",
      `/api2/json/nodes/pve-1/tasks/${encodeURIComponent(upid)}/status`,
      `/api2/json/nodes/pve-1/tasks/${encodeURIComponent(upid)}/log`,
    ],
  );
});

test("UPID URL metacharacters remain inside a single task path segment", async (t) => {
  const special = upid.replace(":100:", ":id%?#\\x:");
  const f = await fixture(t, ({ url }) => {
    assert.equal(url.search, url.pathname.endsWith("/log") ? "?limit=50" : "");
    assert.equal(url.hash, "");
    return { data: { data: url.pathname.endsWith("/status") ? {} : [] } };
  });
  compactResult(await f.call("get_task_status", { upid: special }));
  for (const { url } of f.calls) {
    assert.equal(decodeURIComponent(url.pathname.split("/").at(-2)), special);
  }
});

for (const status of [400, 401, 403, 404, 500]) {
  test(`actual proxmox-api ${status} errors become safe structured MCP failures`, async (t) => {
    const f = await fixture(t, () => ({
      status,
      data: { errors: "synthetic-private-body" },
    }));
    const result = await f.call("list_vms");
    assert.equal(result.isError, true);
    assert.deepEqual(result.structuredContent, {
      error: {
        code: "api_error",
        status,
        message: `Proxmox API Error ${status}`,
      },
    });
    assert.equal(result.content[0].text, `Error: Proxmox API Error ${status}`);
    assert.doesNotMatch(
      JSON.stringify(result),
      /fixture.invalid|synthetic-private-body/,
    );
    assert.equal(f.calls.length, 1);
  });
}

test("malformed cluster IDs fail explicitly; unknown errors cannot leak payloads", async (t) => {
  const f = await fixture(t, () => ({
    data: { data: [{ type: "qemu", node: "pve-1" }] },
  }));
  const result = await f.call("list_vms");
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, "validation_error");
  const cyclic = {};
  cyclic.self = cyclic;
  for (const error of [cyclic, new Error("synthetic-private-body"), null]) {
    const result = createErrorResponse(error);
    assert.equal(result.structuredContent.error.code, "unexpected_error");
    assert.doesNotMatch(JSON.stringify(result), /synthetic-private-body/);
  }
  const network = createErrorResponse(
    new Error(
      "FaILED to call GET https://fixture.invalid/api2/json/nodes cause by:synthetic-private-body",
    ),
  );
  assert.equal(network.structuredContent.error.code, "network_error");
  assert.doesNotMatch(
    JSON.stringify(network),
    /fixture.invalid|synthetic-private-body/,
  );
});

test("configured default node is validated before server startup", () => {
  const result = spawnSync(process.execPath, ["dist/index-readonly.js"], {
    env: {
      ...process.env,
      PROXMOX_HOST: config.host,
      PROXMOX_NODE: "../pve",
      PROXMOX_TOKEN_ID: config.tokenId,
      PROXMOX_TOKEN_SECRET: config.tokenSecret,
    },
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Configuration error/);
});
