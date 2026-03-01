import { z } from 'zod';

// Node names typically consist of alphanumeric characters and hyphens
export const nodeNameSchema = z.string()
  .regex(/^[a-zA-Z0-9-]+$/, 'Node name must contain only alphanumeric characters and hyphens')
  .max(64, 'Node name must be 64 characters or less');

// Storage names typically consist of alphanumeric characters, hyphens, and underscores
export const storageNameSchema = z.string()
  .regex(/^[a-zA-Z0-9-_]+$/, 'Storage name must contain only alphanumeric characters, hyphens, and underscores')
  .max(64, 'Storage name must be 64 characters or less');

// Snapshot names typically consist of alphanumeric characters, hyphens, and underscores
export const snapshotNameSchema = z.string()
  .regex(/^[a-zA-Z0-9-_]+$/, 'Snapshot name must contain only alphanumeric characters, hyphens, and underscores')
  .max(64, 'Snapshot name must be 64 characters or less');

// VM/Container names can be slightly more permissive but should still prevent path traversal
export const resourceNameSchema = z.string()
  .regex(/^[a-zA-Z0-9-_.]+$/, 'Name must contain only alphanumeric characters, hyphens, underscores, and dots')
  .max(64, 'Name must be 64 characters or less');
