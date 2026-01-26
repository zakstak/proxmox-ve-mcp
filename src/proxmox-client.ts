import proxmoxApi from 'proxmox-api';
import type { Config } from './config.js';
import { createFetch } from './utils/http-client.js';

export function createProxmoxClient(config: Config) {
  const customFetch = createFetch(config.verifySsl);

  return proxmoxApi({
    host: config.host,
    port: config.port,
    tokenID: config.tokenId,
    tokenSecret: config.tokenSecret,
    fetch: customFetch as any,
  });
}

export type ProxmoxClient = ReturnType<typeof createProxmoxClient>;
