// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import { queryAll, queryOne, execute } from "../../db/index.js";
import { parseSessionFile, findSessionFiles, type ParsedSession } from "./parser.js";

export interface SessionSearchResult {
  id: string;
  filePath: string;
  summary: string;
  messageCount: number;
  startedAt: string;
  endedAt: string;
  relevance: number;
}

/**
 * Ensure the sessions table exists in the database.
 */
export function ensureSessionsTable(db: Database): void {
  execute(
    db,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      summary TEXT,
      message_count INTEGER,
      started_at TEXT,
      ended_at TEXT,
      content TEXT,
      indexed_at TEXT DEFAULT (datetime('now'))
    )`,
  );

  // Create index for sorting by date
  try {
    db.run("CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at)");
  } catch {
    // Index already exists
  }
}

/**
 * Build a full-text searchable content string from session entries.
 */
function buildContentString(session: ParsedSession): string {
  return session.entries
    .filter((e) => e.type === "user" || e.type === "assistant")
    .map((e) => e.content)
    .join("\n");
}

/**
 * Index a parsed session into the database.
 * Uses INSERT OR REPLACE to handle re-indexing.
 */
export function indexSession(db: Database, session: ParsedSession): void {
  ensureSessionsTable(db);

  const content = buildContentString(session);

  execute(
    db,
    `INSERT OR REPLACE INTO sessions (id, file_path, summary, message_count, started_at, ended_at, content, indexed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      session.id,
      session.filePath,
      session.summary,
      session.messageCount,
      session.startedAt,
      session.endedAt,
      content,
    ],
  );
}

/**
 * Search indexed sessions by query string.
 * Uses LIKE matching on both summary and content columns.
 * Results matching summary get a higher relevance score.
 */
export function searchSessions(
  db: Database,
  query: string,
  limit = 20,
): SessionSearchResult[] {
  ensureSessionsTable(db);

  const pattern = `%${query}%`;

  // Score: 2 if matches summary, 1 if matches content only
  const rows = queryAll(
    db,
    `SELECT
       id, file_path, summary, message_count, started_at, ended_at,
       (CASE WHEN summary LIKE ? THEN 2 ELSE 0 END +
        CASE WHEN content LIKE ? THEN 1 ELSE 0 END) AS relevance
     FROM sessions
     WHERE summary LIKE ? OR content LIKE ?
     ORDER BY relevance DESC, started_at DESC
     LIMIT ?`,
    [pattern, pattern, pattern, pattern, limit],
  );

  return rows.map((row) => ({
    id: row.id as string,
    filePath: row.file_path as string,
    summary: row.summary as string,
    messageCount: row.message_count as number,
    startedAt: row.started_at as string,
    endedAt: row.ended_at as string,
    relevance: row.relevance as number,
  }));
}

/**
 * Get a single session by ID.
 * Returns the full parsed session (re-parsed from file for entries).
 */
export async function getSessionById(
  db: Database,
  id: string,
): Promise<ParsedSession | null> {
  ensureSessionsTable(db);

  const row = queryOne(db, "SELECT file_path FROM sessions WHERE id = ?", [id]);
  if (!row) return null;

  try {
    return await parseSessionFile(row.file_path as string);
  } catch {
    return null;
  }
}

/**
 * List all indexed sessions, sorted newest first.
 */
export function listSessions(db: Database, limit = 50): SessionSearchResult[] {
  ensureSessionsTable(db);

  const rows = queryAll(
    db,
    `SELECT id, file_path, summary, message_count, started_at, ended_at
     FROM sessions
     ORDER BY started_at DESC
     LIMIT ?`,
    [limit],
  );

  return rows.map((row) => ({
    id: row.id as string,
    filePath: row.file_path as string,
    summary: row.summary as string,
    messageCount: row.message_count as number,
    startedAt: row.started_at as string,
    endedAt: row.ended_at as string,
    relevance: 0,
  }));
}

/**
 * Reindex all session files from the base directory.
 * Returns the number of sessions indexed.
 */
export async function reindexAll(db: Database, baseDir: string): Promise<number> {
  ensureSessionsTable(db);

  const files = await findSessionFiles(baseDir);
  let count = 0;

  for (const file of files) {
    try {
      const session = await parseSessionFile(file);
      // Skip empty sessions (no meaningful messages)
      if (session.messageCount === 0) continue;
      indexSession(db, session);
      count++;
    } catch {
      // Skip files that fail to parse
    }
  }

  return count;
}
