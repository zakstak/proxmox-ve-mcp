import proxmoxApi from 'proxmox-api';
import type { Config } from './config.js';

export function createProxmoxClient(config: Config) {
  if (!config.verifySsl) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  return proxmoxApi({
    host: config.host,
    port: config.port,
    tokenID: config.tokenId,
    tokenSecret: config.tokenSecret,
  });
}

export type ProxmoxClient = ReturnType<typeof createProxmoxClient>;
