// Copyright 2025 #1 Future — Apache 2.0 License

// ── Action Tier System ──────────────────────────────────────────────
// Green  = safe, auto-execute (read files, check status, get info)
// Yellow = notify user, execute unless denied (install software, change settings)
// Red    = require explicit approval (delete files, modify security, run scripts)

export type ActionTier = "green" | "yellow" | "red";

export interface Action {
  id: string;
  tier: ActionTier;
  description: string;
  command: string;
  module: string;
  status: "pending" | "approved" | "denied" | "executed" | "failed";
  result?: string;
  error?: string;
  createdAt: string;
  resolvedAt?: string;
}

// ── AI Layer ────────────────────────────────────────────────────────

export type AIProvider = "ollama" | "claude" | "openai" | "gemini";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  actions?: Action[];
}

// ── System Status ───────────────────────────────────────────────────

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

// ── File Browser ────────────────────────────────────────────────────

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  extension?: string;
}

export interface FileListRequest {
  path: string;
}

export interface FileListResponse {
  path: string;
  entries: FileEntry[];
  parent: string | null;
}

export interface FileReadRequest {
  path: string;
}

export interface FileReadResponse {
  path: string;
  content: string;
  encoding: string;
  size: number;
}

// ── Terminal ────────────────────────────────────────────────────────

export interface TerminalCreate {
  cols?: number;
  rows?: number;
  shell?: string;
}

export interface TerminalSession {
  id: string;
  pid: number;
  createdAt: string;
}

// ── WebSocket Messages ──────────────────────────────────────────────

export type WSMessageType =
  | "terminal:data"
  | "terminal:resize"
  | "chat:stream"
  | "chat:done"
  | "action:request"
  | "action:response"
  | "system:status";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  sessionId?: string;
  payload: T;
}

export interface TerminalDataPayload {
  data: string;
}

export interface TerminalResizePayload {
  cols: number;
  rows: number;
}

export interface ChatStreamPayload {
  conversationId: string;
  delta: string;
}

export interface ChatDonePayload {
  conversationId: string;
  actions?: Action[];
}

export interface ActionRequestPayload {
  action: Action;
}

export interface ActionResponsePayload {
  actionId: string;
  approved: boolean;
}

// ── IT Department Modules ───────────────────────────────────────────

export interface SecurityScanResult {
  score: number; // 0-100
  issues: SecurityIssue[];
  scannedAt: string;
}

export interface SecurityIssue {
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  recommendation: string;
}

export interface SystemConfigChange {
  module: string;
  setting: string;
  oldValue: string;
  newValue: string;
  tier: ActionTier;
}

// ── Memory ─────────────────────────────────────────────────────────

export type MemoryCategory = "fact" | "preference" | "event" | "skill" | "relationship" | "context";

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  importance: number;
  embedding?: number[];
  source: "conversation" | "inventory" | "system" | "manual";
  sourceId?: string;
  lastAccessed?: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySearchResult {
  memory: Memory;
  similarity: number;
}

// ── Inventory ──────────────────────────────────────────────────────

export type ItemCondition = "new" | "like_new" | "good" | "fair" | "poor" | "broken" | "for_parts";
export type ItemStatus = "owned" | "lent" | "stored" | "listed" | "sold" | "donated" | "trashed" | "lost";

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  quantity: number;
  condition: ItemCondition;
  location?: string;
  locationDetail?: string;
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  purchasePrice?: number;
  purchaseStore?: string;
  acquiredDate?: string;
  warrantyExpires?: string;
  parentId?: string;
  status: ItemStatus;
  notes?: string;
  tags?: string[];
  children?: InventoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InventorySearchParams {
  query?: string;
  category?: string;
  location?: string;
  status?: ItemStatus;
  tag?: string;
  parentId?: string | null;
  minPrice?: number;
  maxPrice?: number;
}

export interface InventorySummary {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  byCategory: Record<string, { count: number; value: number }>;
  byLocation: Record<string, number>;
}

// ── Tool System ────────────────────────────────────────────────────

export type ToolDomain = "drivers" | "debloat" | "packages" | "file-ops" | "system-tools";

export interface ToolInfo {
  id: string;
  name: string;
  description: string;
  domain: ToolDomain;
  installed: boolean;
  version?: string;
  path?: string;
  installMethod?: string;
  lastChecked?: string;
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
  params: ToolParamDef[];
}

export interface ToolParamDef {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

export interface ToolOperationRequest {
  domain: ToolDomain;
  intent: string;
  params: Record<string, string>;
  tier: ActionTier;
  description: string;
}

export interface ToolOperationResult {
  success: boolean;
  toolId: string;
  output?: string;
  error?: string;
  duration: number;
}

// ── Server Config ───────────────────────────────────────────────────

export interface ServerConfig {
  port: number;
  host: string;
  ai: AIConfig;
  dbPath: string;
}
