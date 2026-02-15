// API response types adapted for the new FutureBuddy server

import type {
  Action,
  SystemStatus,
  FileEntry,
  ChatMessage,
  TerminalSession,
  ToolInfo,
  ToolOperationInfo,
} from './models';

// --- Chat ---

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  actions?: Action[];
}

// SSE streaming events from POST /api/chat/stream
export interface ChatStreamDelta {
  delta: string;
}

export interface ChatStreamDone {
  done: true;
  conversationId: string;
  actions?: Action[];
}

export interface ChatStreamError {
  error: string;
}

export type ChatStreamEvent = ChatStreamDelta | ChatStreamDone | ChatStreamError;

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  conversationId: string;
  messages: ChatMessage[];
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
}

// --- Actions ---

export interface PendingActionsResponse {
  actions: Action[];
}

export interface ActionResolveRequest {
  approved: boolean;
}

// --- Files ---

export interface FileListResponse {
  path: string;
  entries: FileEntry[];
  parent: string | null;
}

export interface FileReadResponse {
  path: string;
  content: string;
  encoding: string;
  size: number;
}

// --- Terminal ---

export interface TerminalCreateRequest {
  cols?: number;
  rows?: number;
  shell?: string;
}

export interface TerminalSessionsResponse {
  sessions: TerminalSession[];
}

// --- System ---

export type SystemStatusResponse = SystemStatus;

// --- Models ---

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface ModelsResponse {
  models: OllamaModel[];
  error?: string;
}

export interface ProvidersResponse {
  current: string;
  currentModel: string;
  providers: Record<string, { available: boolean; models?: string[] }>;
}

// --- Tools ---

export interface ToolsResponse {
  tools: ToolInfo[];
}

export interface ToolOperationsResponse {
  operations: ToolOperationInfo[];
}
