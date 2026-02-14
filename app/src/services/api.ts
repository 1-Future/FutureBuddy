// Copyright 2025 #1 Future — Apache 2.0 License

const DEFAULT_SERVER = "http://192.168.1.93:3000";

let serverUrl = DEFAULT_SERVER;

export function setServerUrl(url: string) {
  serverUrl = url.replace(/\/$/, "");
}

export function getServerUrl() {
  return serverUrl;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${serverUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

// Health check
export async function checkConnection(): Promise<boolean> {
  try {
    const data = await request<{ status: string }>("/");
    return data.status === "running";
  } catch {
    return false;
  }
}

// Chat
export async function sendMessage(message: string, conversationId?: string) {
  return request<{
    message: { role: string; content: string; timestamp: string };
    conversationId: string;
    actions?: any[];
  }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversationId }),
  });
}

export async function getConversations() {
  return request<{ conversations: any[] }>("/api/chat");
}

export async function getConversation(id: string) {
  return request<{ conversationId: string; messages: any[] }>(`/api/chat/${id}`);
}

// System
export async function getSystemStatus() {
  return request<any>("/api/system/status");
}

export async function getSecurityScan() {
  return request<any>("/api/system/security");
}

export async function applyConfig(module: string, action: string, params?: Record<string, string>) {
  return request<any>("/api/system/config", {
    method: "POST",
    body: JSON.stringify({ module, action, params }),
  });
}

// Files
export async function listFiles(path: string) {
  return request<any>(`/api/files/list?path=${encodeURIComponent(path)}`);
}

export async function readFile(path: string) {
  return request<any>(`/api/files/read?path=${encodeURIComponent(path)}`);
}

// Actions
export async function getPendingActions() {
  return request<{ actions: any[] }>("/api/actions/pending");
}

export async function resolveAction(id: string, approved: boolean) {
  return request<any>(`/api/actions/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ approved }),
  });
}

// Terminal
export async function createTerminal(cols = 120, rows = 30) {
  return request<{ id: string; pid: number; createdAt: string }>("/api/terminal/create", {
    method: "POST",
    body: JSON.stringify({ cols, rows }),
  });
}

export async function getTerminalSessions() {
  return request<{ sessions: any[] }>("/api/terminal/sessions");
}
