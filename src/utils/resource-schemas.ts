import { z } from "zod";

// Proxmox PVE::JSONSchema formats: pve-node, pve-vmid, pve-storage-id,
// and pve-snapshot-name (pve-configid, maxLength 40).
export const nodeNameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/);
export const vmIdSchema = z.number().int().min(100).max(999_999_999);
export const storageIdSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9._-]*[a-zA-Z0-9]$/);
export const snapshotNameSchema = z
  .string()
  .max(40)
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]+$/);

// PVE::UPID::decode accepts empty task IDs, token identities containing !,
// and 8- or 9-digit process start times. Callers URL-encode the parsed UPID
// before passing it to proxmox-api's partially escaped path builder.
export const taskUpidSchema = z
  .string()
  .regex(
    /^UPID:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?:[0-9A-Fa-f]{8}:[0-9A-Fa-f]{8,9}:[0-9A-Fa-f]{8}:[^:\s/]+:[^:\s/]*:[^:\s/]+:$/,
  );
