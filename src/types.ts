export interface NodeInfo {
  node: string;
  status: string;
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  uptime?: number;
}

export interface VmInfo {
  vmid: number;
  name?: string;
  status: string;
  cpu?: number;
  cpus?: number;
  mem?: number;
  maxmem?: number;
  uptime?: number;
  netin?: number;
  netout?: number;
  diskread?: number;
  diskwrite?: number;
}

export interface ContainerInfo {
  vmid: number;
  name?: string;
  status: string;
  cpu?: number;
  cpus?: number;
  mem?: number;
  maxmem?: number;
  uptime?: number;
  type?: string;
}

export interface StorageInfo {
  storage: string;
  type: string;
  content: string;
  active?: number;
  enabled?: number;
  shared?: number;
  total?: number;
  used?: number;
  avail?: number;
  used_fraction?: number;
}

export interface SnapshotInfo {
  name: string;
  description?: string;
  snaptime?: number;
  vmstate?: boolean;
  parent?: string;
}

export interface TaskInfo {
  upid: string;
  node: string;
  type: string;
  id?: string;
  user: string;
  status?: string;
  starttime: number;
  endtime?: number;
  pstart?: number;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
