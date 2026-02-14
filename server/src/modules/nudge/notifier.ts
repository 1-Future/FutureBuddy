// Copyright 2025 #1 Future — Apache 2.0 License

import { randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import { queryAll, queryOne, execute } from "../../db/index.js";
import type { NudgeCandidate } from "./analyzer.js";

// ── Types ────────────────────────────────────────────────────────────

export type NudgeStatus = "pending" | "accepted" | "snoozed" | "dismissed";

export interface Nudge {
  id: string;
  type: string;
  title: string;
  description: string;
  content: string;
  noveltyScore: number;
  tags: string[];
  status: NudgeStatus;
  createdAt: string;
  resolvedAt?: string;
}

// ── Schema ───────────────────────────────────────────────────────────

export function ensureNudgeTable(db: Database): void {
  execute(
    db,
    `CREATE TABLE IF NOT EXISTS nudges (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      novelty_score REAL DEFAULT 0.5,
      tags TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','snoozed','dismissed')),
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    )`,
  );
  execute(
    db,
    `CREATE INDEX IF NOT EXISTS idx_nudges_status ON nudges(status)`,
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function rowToNudge(row: Record<string, unknown>): Nudge {
  return {
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    description: (row.description as string) || "",
    content: (row.content as string) || "",
    noveltyScore: (row.novelty_score as number) || 0.5,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    status: row.status as NudgeStatus,
    createdAt: row.created_at as string,
    resolvedAt: (row.resolved_at as string) || undefined,
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────

export function createNudge(db: Database, candidate: NudgeCandidate): Nudge {
  const id = randomUUID();
  const tagsJson = JSON.stringify(candidate.tags);

  execute(
    db,
    `INSERT INTO nudges (id, type, title, description, content, novelty_score, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, candidate.type, candidate.title, candidate.description, candidate.content, candidate.noveltyScore, tagsJson],
  );

  const row = queryOne(db, `SELECT * FROM nudges WHERE id = ?`, [id]);
  return rowToNudge(row);
}

export function getNudges(db: Database, status?: NudgeStatus, limit?: number): Nudge[] {
  let sql = `SELECT * FROM nudges`;
  const params: unknown[] = [];

  if (status) {
    sql += ` WHERE status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC`;

  if (limit && limit > 0) {
    sql += ` LIMIT ?`;
    params.push(limit);
  }

  const rows = queryAll(db, sql, params);
  return rows.map(rowToNudge);
}

export function resolveNudge(db: Database, id: string, status: NudgeStatus): Nudge | undefined {
  const existing = queryOne(db, `SELECT * FROM nudges WHERE id = ?`, [id]);
  if (!existing) return undefined;

  execute(
    db,
    `UPDATE nudges SET status = ?, resolved_at = datetime('now') WHERE id = ?`,
    [status, id],
  );

  const updated = queryOne(db, `SELECT * FROM nudges WHERE id = ?`, [id]);
  return rowToNudge(updated);
}

export function getNudgeStats(db: Database): {
  total: number;
  pending: number;
  accepted: number;
  snoozed: number;
  dismissed: number;
} {
  const total = queryOne(db, `SELECT COUNT(*) as count FROM nudges`);
  const pending = queryOne(db, `SELECT COUNT(*) as count FROM nudges WHERE status = 'pending'`);
  const accepted = queryOne(db, `SELECT COUNT(*) as count FROM nudges WHERE status = 'accepted'`);
  const snoozed = queryOne(db, `SELECT COUNT(*) as count FROM nudges WHERE status = 'snoozed'`);
  const dismissed = queryOne(db, `SELECT COUNT(*) as count FROM nudges WHERE status = 'dismissed'`);

  return {
    total: (total?.count as number) || 0,
    pending: (pending?.count as number) || 0,
    accepted: (accepted?.count as number) || 0,
    snoozed: (snoozed?.count as number) || 0,
    dismissed: (dismissed?.count as number) || 0,
  };
}
