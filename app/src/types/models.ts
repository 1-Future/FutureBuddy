// Domain models matching the new FutureBuddy server

export type ActionTier = 'green' | 'yellow' | 'red';
export type ActionStatus = 'pending' | 'approved' | 'denied' | 'executed' | 'failed';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Action {
  id: string;
  tier: ActionTier;
  description: string;
  command: string;
  module: string;
  status: ActionStatus;
  result?: string;
  error?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
  images?: string[];
}

export interface SystemStatus {
  hostname: string;
  platform: string;
  uptime: number;
  cpu: {
    model: string;
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: DiskInfo[];
  network: NetworkInfo[];
}

export interface DiskInfo {
  mount: string;
  label: string;
  total: number;
  used: number;
  free: number;
}

export interface NetworkInfo {
  name: string;
  ip: string;
  mac: string;
  type: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  extension?: string;
}

export interface TerminalSession {
  id: string;
  pid: number;
  createdAt: string;
}

export type ToolDomain = 'drivers' | 'debloat' | 'packages' | 'file-ops' | 'system-tools';

export interface ToolInfo {
  id: string;
  name: string;
  description: string;
  domain: ToolDomain;
  installed: boolean;
  version?: string;
  path?: string;
  capabilities: string[];
  installCommand?: string;
}

export interface ToolOperationInfo {
  id: string;
  toolId: string;
  domain: ToolDomain;
  name: string;
  description: string;
  tier: ActionTier;
  params: { name: string; description: string; required: boolean; default?: string }[];
}
