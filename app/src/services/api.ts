// REST API client for the new FutureBuddy server

import { useConnectionStore } from '../stores/connection.store';
import type {
  ChatRequest,
  ChatResponse,
  ConversationListResponse,
  ConversationDetail,
  PendingActionsResponse,
  ActionResolveRequest,
  FileListResponse,
  FileReadResponse,
  TerminalCreateRequest,
  TerminalSessionsResponse,
  SystemStatusResponse,
  ModelsResponse,
  ProvidersResponse,
  ToolsResponse,
  ToolOperationsResponse,
} from '../types/api';
import type { Action, TerminalSession } from '../types/models';

function getBaseUrl(): string {
  return useConnectionStore.getState().serverUrl.replace(/\/+$/, '');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- Health ---

export function checkConnection(): Promise<{ status: string }> {
  return request('/');
}

// --- Chat ---

export function sendMessage(body: ChatRequest): Promise<ChatResponse> {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getConversations(): Promise<ConversationListResponse> {
  return request('/api/chat');
}

export function getConversation(id: string): Promise<ConversationDetail> {
  return request(`/api/chat/${id}`);
}

// --- Actions ---

export function getPendingActions(): Promise<PendingActionsResponse> {
  return request('/api/actions/pending');
}

export function resolveAction(id: string, approved: boolean): Promise<Action> {
  return request(`/api/actions/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ approved } satisfies ActionResolveRequest),
  });
}

// --- Files ---

export function listFiles(path?: string): Promise<FileListResponse> {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  return request(`/api/files/list${query}`);
}

export function readFile(path: string): Promise<FileReadResponse> {
  return request(`/api/files/read?path=${encodeURIComponent(path)}`);
}

// --- Terminal ---

export function createTerminal(opts?: TerminalCreateRequest): Promise<TerminalSession> {
  return request('/api/terminal/create', {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  });
}

export function getTerminalSessions(): Promise<TerminalSessionsResponse> {
  return request('/api/terminal/sessions');
}

export function killTerminal(id: string): Promise<{ success: boolean }> {
  return request(`/api/terminal/${id}`, { method: 'DELETE' });
}

// --- System ---

export function getSystemStatus(): Promise<SystemStatusResponse> {
  return request('/api/system/status');
}

// --- Models ---

export function getModels(): Promise<ModelsResponse> {
  return request('/api/models');
}

export function getProviders(): Promise<ProvidersResponse> {
  return request('/api/models/providers');
}

export function getModelStatus(): Promise<{ ollama: string; baseUrl: string }> {
  return request('/api/models/status');
}

// --- Tools ---

export function getTools(): Promise<ToolsResponse> {
  return request('/api/tools');
}

export function getInstalledTools(): Promise<ToolsResponse> {
  return request('/api/tools/installed');
}

export function getToolOperations(): Promise<ToolOperationsResponse> {
  return request('/api/tools/operations');
}

export function scanTools(): Promise<ToolsResponse> {
  return request('/api/tools/scan', { method: 'POST' });
}
