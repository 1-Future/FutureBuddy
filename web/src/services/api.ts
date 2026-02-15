// Copyright 2025 #1 Future — Apache 2.0 License

const BASE = "/api";

// ── Types ────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  actions?: Action[];
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Action {
  id: string;
  tier: "green" | "yellow" | "red";
  description: string;
  command: string;
  module: string;
  status: "pending" | "approved" | "denied" | "executed" | "failed";
  result?: string;
  error?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface SystemStatus {
  hostname: string;
  platform: string;
  uptime: number;
  cpu: { model: string; usage: number; cores: number };
  memory: { total: number; used: number; free: number };
  disk: { mount: string; label: string; total: number; used: number; free: number }[];
  network: { name: string; ip: string; mac: string; type: string }[];
}

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  extension?: string;
}

interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  source: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  quantity: number;
  condition: string;
  location?: string;
  status: string;
  tags?: string[];
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
}

interface InventorySummary {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  byCategory: Record<string, { count: number; value: number }>;
  byLocation: Record<string, number>;
}

// ── Helpers ──────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`);
}

// ── Health ───────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch("/health", { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getServerInfo(): Promise<{
  name: string;
  version: string;
  status: string;
  uptime: number;
}> {
  const res = await fetch("/health");
  if (!res.ok) throw new Error("Server unreachable");
  return res.json();
}

// ── Chat ─────────────────────────────────────────────────────────────

export async function sendMessage(
  message: string,
  conversationId?: string,
): Promise<ChatResponse> {
  return post("/chat", { message, conversationId });
}

export async function streamMessage(
  message: string,
  conversationId: string | undefined,
  onChunk: (delta: string) => void,
  onDone: (data: { conversationId: string; actions?: Action[] }) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!res.ok) throw new Error(`Stream error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.error) {
          throw new Error(data.error);
        } else if (data.done) {
          onDone(data);
        } else if (data.delta) {
          onChunk(data.delta);
        }
      } catch (err) {
        if (err instanceof Error && err.message !== "Unexpected end of JSON input") {
          throw err;
        }
      }
    }
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const data = await get<{ conversations: Conversation[] }>("/chat");
  return data.conversations;
}

export async function getConversation(
  id: string,
): Promise<{ conversationId: string; messages: ChatMessage[] }> {
  return get(`/chat/${id}`);
}

// ── System ───────────────────────────────────────────────────────────

export async function getSystemStatus(): Promise<SystemStatus> {
  return get("/system/status");
}

export async function getSecurityScan(): Promise<{
  score: number;
  issues: { severity: string; category: string; description: string; recommendation: string }[];
  scannedAt: string;
}> {
  return get("/system/security");
}

// ── Actions ──────────────────────────────────────────────────────────

export async function getPendingActions(): Promise<Action[]> {
  const data = await get<{ actions: Action[] }>("/actions/pending");
  return data.actions;
}

export async function getActions(
  status?: string,
  limit?: number,
): Promise<Action[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const data = await get<{ actions: Action[] }>(`/actions${qs ? `?${qs}` : ""}`);
  return data.actions;
}

export async function resolveAction(
  id: string,
  approved: boolean,
): Promise<Action> {
  return post(`/actions/${id}/resolve`, { approved });
}

// ── Files ────────────────────────────────────────────────────────────

export async function listFiles(
  path: string,
): Promise<{ path: string; entries: FileEntry[]; parent: string | null }> {
  return get(`/files/list?path=${encodeURIComponent(path)}`);
}

export async function readFile(
  path: string,
): Promise<{ path: string; content: string; size: number }> {
  return get(`/files/read?path=${encodeURIComponent(path)}`);
}

// ── Memory ───────────────────────────────────────────────────────────

export async function getMemories(
  category?: string,
): Promise<Memory[]> {
  const qs = category ? `?category=${category}` : "";
  const data = await get<{ memories: Memory[] }>(`/memory${qs}`);
  return data.memories;
}

export async function searchMemories(
  query: string,
  limit = 10,
): Promise<{ memory: Memory; similarity: number }[]> {
  const data = await get<{ results: { memory: Memory; similarity: number }[] }>(
    `/memory/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return data.results;
}

export async function getMemoryStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  withEmbeddings: number;
}> {
  return get("/memory/stats");
}

export async function createMemory(data: {
  content: string;
  category: string;
  importance?: number;
}): Promise<Memory> {
  return post("/memory", data);
}

export async function deleteMemory(id: string): Promise<void> {
  return del(`/memory/${id}`);
}

// ── Inventory ────────────────────────────────────────────────────────

export async function getInventoryItems(params?: {
  query?: string;
  category?: string;
  location?: string;
  status?: string;
  tag?: string;
}): Promise<InventoryItem[]> {
  const sp = new URLSearchParams();
  if (params?.query) sp.set("query", params.query);
  if (params?.category) sp.set("category", params.category);
  if (params?.location) sp.set("location", params.location);
  if (params?.status) sp.set("status", params.status);
  if (params?.tag) sp.set("tag", params.tag);
  const qs = sp.toString();
  const data = await get<{ items: InventoryItem[] }>(`/inventory${qs ? `?${qs}` : ""}`);
  return data.items;
}

export async function getInventorySummary(): Promise<InventorySummary> {
  return get("/inventory/summary");
}

export async function createInventoryItem(
  data: Partial<InventoryItem>,
): Promise<InventoryItem> {
  return post("/inventory", data);
}

export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItem>,
): Promise<InventoryItem> {
  return patch(`/inventory/${id}`, data);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  return del(`/inventory/${id}`);
}

// ── Terminal ─────────────────────────────────────────────────────────

export async function createTerminal(
  cols?: number,
  rows?: number,
): Promise<{ id: string; pid: number; createdAt: string }> {
  return post("/terminal/create", { cols, rows });
}

export async function getTerminalSessions(): Promise<
  { id: string; pid: number; createdAt: string }[]
> {
  return get("/terminal/sessions");
}

export async function killTerminal(id: string): Promise<void> {
  return del(`/terminal/${id}`);
}

// ── Sessions ──────────────────────────────────────────────────────────

export interface SessionEntry {
  type: "user" | "assistant" | "tool_use" | "tool_result";
  content: string;
  timestamp?: string;
}

export interface SessionSummary {
  id: string;
  filePath: string;
  summary: string;
  messageCount: number;
  startedAt: string;
  endedAt: string;
  relevance?: number;
}

export interface SessionDetail {
  id: string;
  filePath: string;
  entries: SessionEntry[];
  summary: string;
  messageCount: number;
  startedAt: string;
  endedAt: string;
}

export async function getSessions(limit = 50): Promise<SessionSummary[]> {
  const data = await get<{ sessions: SessionSummary[] }>(`/sessions?limit=${limit}`);
  return data.sessions;
}

export async function searchSessions(
  query: string,
  limit = 20,
): Promise<SessionSummary[]> {
  const data = await get<{ results: SessionSummary[] }>(
    `/sessions/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return data.results;
}

export async function getSession(id: string): Promise<SessionDetail> {
  const data = await get<{ session: SessionDetail }>(`/sessions/${id}`);
  return data.session;
}

export async function reindexSessions(): Promise<{ indexed: number; directory: string }> {
  return post("/sessions/reindex", {});
}

// ── Bookmarks ─────────────────────────────────────────────────────────

interface BookmarkItem {
  id: string;
  url: string;
  title: string | null;
  category: string;
  context: string | null;
  source: string;
  source_id: string | null;
  visit_count: number;
  created_at: string;
  updated_at: string;
}

interface BookmarkStats {
  total: number;
  byCategory: Record<string, number>;
}

export async function getBookmarks(params?: {
  category?: string;
  query?: string;
}): Promise<{ bookmarks: BookmarkItem[] }> {
  const sp = new URLSearchParams();
  if (params?.category) sp.set("category", params.category);
  if (params?.query) sp.set("query", params.query);
  const qs = sp.toString();
  return get(`/bookmarks${qs ? `?${qs}` : ""}`);
}

export async function getBookmarkStats(): Promise<BookmarkStats> {
  return get("/bookmarks/stats");
}

export async function addBookmark(data: {
  url: string;
  title?: string;
  category?: string;
}): Promise<BookmarkItem> {
  return post("/bookmarks", data);
}

export async function extractBookmarks(
  text: string,
  source?: "session" | "chat" | "manual",
  sourceId?: string,
): Promise<{ extracted: BookmarkItem[]; count: number }> {
  return post("/bookmarks/extract", { text, source, sourceId });
}

export async function deleteBookmark(id: string): Promise<void> {
  return del(`/bookmarks/${id}`);
}

// ── Nudges ────────────────────────────────────────────────────────────

export interface Nudge {
  id: string;
  type: string;
  title: string;
  description: string;
  content: string;
  noveltyScore: number;
  tags: string[];
  status: "pending" | "accepted" | "snoozed" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
}

export async function getPendingNudges(): Promise<Nudge[]> {
  const data = await get<{ nudges: Nudge[] }>("/nudges/pending");
  return data.nudges;
}

export async function resolveNudge(id: string, status: string): Promise<void> {
  await post(`/nudges/${id}/resolve`, { status });
}

// ── AutoTube ──────────────────────────────────────────────────────────

export interface AutoTubeProject {
  id: string;
  session_id: string;
  title: string | null;
  description: string | null;
  script: string | null;
  status: "draft" | "scripted" | "approved" | "rendering" | "published";
  created_at: string;
  updated_at: string;
}

export async function getAutoTubeProjects(): Promise<AutoTubeProject[]> {
  const data = await get<{ projects: AutoTubeProject[] }>("/autotube");
  return data.projects;
}

export async function createAutoTubeProject(
  sessionPath: string,
): Promise<{ id: string; sessionId: string; summary: string }> {
  return post("/autotube/create", { sessionPath });
}

export async function generateAutoTubeScript(
  id: string,
  sessionPath: string,
): Promise<any> {
  return post("/autotube/script", { id, sessionPath });
}

export async function approveAutoTubeProject(id: string): Promise<void> {
  await post(`/autotube/${id}/approve`, {});
}

export async function deleteAutoTubeProject(id: string): Promise<void> {
  await del(`/autotube/${id}`);
}

// Re-export types for convenience
export type {
  ChatMessage,
  ChatResponse,
  Conversation,
  Action,
  SystemStatus,
  FileEntry,
  Memory,
  InventoryItem,
  InventorySummary,
  BookmarkItem,
  BookmarkStats,
};
