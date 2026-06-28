import { z } from 'zod';
import 'dotenv/config';

const configSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().default(8006),
  node: z.string().min(1),
  tokenId: z.string().min(1),
  tokenSecret: z.string().min(1),
  verifySsl: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .default(false),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    host: process.env.PROXMOX_HOST,
    port: process.env.PROXMOX_PORT,
    node: process.env.PROXMOX_NODE,
    tokenId: process.env.PROXMOX_TOKEN_ID,
    tokenSecret: process.env.PROXMOX_TOKEN_SECRET,
    verifySsl: process.env.PROXMOX_VERIFY_SSL,
  });

  if (!result.success) {
    console.error('[MCP] Configuration error:', JSON.stringify(result.error.format(), null, 2));
    console.error('[MCP] Required environment variables:');
    console.error('  PROXMOX_HOST, PROXMOX_NODE, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET');
    process.exit(1);
  }

  return result.data;
}
