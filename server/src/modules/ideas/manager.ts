// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type { Idea, IdeaStatus, IdeasSummary } from "@futurebuddy/shared";
import { queryAll, queryOne, execute } from "../../db/index.js";
import { randomUUID } from "node:crypto";

export interface CreateIdeaData {
  text: string;
  selectedText?: string;
  sourceConversationId?: string;
  sourceMessageContent?: string;
  status?: IdeaStatus;
  notes?: string;
  tags?: string[];
}

export interface UpdateIdeaData {
  text?: string;
  status?: IdeaStatus;
  notes?: string;
}

function rowToIdea(row: any): Idea {
  return {
    id: row.id,
    text: row.text,
    selectedText: row.selected_text,
    sourceConversationId: row.source_conversation_id || undefined,
    sourceMessageContent: row.source_message_content || undefined,
    status: row.status as IdeaStatus,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createIdea(db: Database, data: CreateIdeaData): Idea {
  const id = randomUUID();
  const now = new Date().toISOString();

  execute(
    db,
    `INSERT INTO ideas (
      id, text, selected_text, source_conversation_id, source_message_content,
      status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.text,
      data.selectedText ?? "",
      data.sourceConversationId ?? null,
      data.sourceMessageContent ?? null,
      data.status ?? "spark",
      data.notes ?? null,
      now,
      now,
    ],
  );

  if (data.tags && data.tags.length > 0) {
    addIdeaTags(db, id, data.tags);
  }

  return getIdea(db, id)!;
}

export function getIdea(db: Database, id: string): Idea | undefined {
  const row = queryOne(db, "SELECT * FROM ideas WHERE id = ?", [id]);
  if (!row) return undefined;

  const idea = rowToIdea(row);
  idea.tags = queryAll(db, "SELECT tag FROM idea_tags WHERE idea_id = ?", [id]).map((r: any) => r.tag);
  return idea;
}

export function searchIdeas(
  db: Database,
  params: { query?: string; status?: string; tag?: string },
): Idea[] {
  const conditions: string[] = [];
  const values: any[] = [];

  if (params.query) {
    conditions.push("(i.text LIKE ? OR i.selected_text LIKE ? OR i.notes LIKE ?)");
    const like = `%${params.query}%`;
    values.push(like, like, like);
  }

  if (params.status) {
    conditions.push("i.status = ?");
    values.push(params.status);
  }

  let sql: string;

  if (params.tag) {
    sql = `SELECT DISTINCT i.* FROM ideas i
      JOIN idea_tags t ON t.idea_id = i.id
      WHERE t.tag = ?`;
    values.unshift(params.tag);
    if (conditions.length > 0) {
      sql += " AND " + conditions.join(" AND ");
    }
  } else {
    sql = "SELECT i.* FROM ideas i";
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
  }

  sql += " ORDER BY i.updated_at DESC";

  const rows = queryAll(db, sql, values);
  return rows.map((row: any) => {
    const idea = rowToIdea(row);
    idea.tags = queryAll(db, "SELECT tag FROM idea_tags WHERE idea_id = ?", [idea.id]).map(
      (r: any) => r.tag,
    );
    return idea;
  });
}

export function updateIdea(db: Database, id: string, updates: UpdateIdeaData): Idea | undefined {
  const existing = queryOne(db, "SELECT id FROM ideas WHERE id = ?", [id]);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: any[] = [];

  const map: Record<string, string> = {
    text: "text",
    status: "status",
    notes: "notes",
  };

  for (const [key, column] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${column} = ?`);
      values.push((updates as any)[key] ?? null);
    }
  }

  if (fields.length === 0) return getIdea(db, id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  execute(db, `UPDATE ideas SET ${fields.join(", ")} WHERE id = ?`, values);
  return getIdea(db, id);
}

export function deleteIdea(db: Database, id: string): boolean {
  const existing = queryOne(db, "SELECT id FROM ideas WHERE id = ?", [id]);
  if (!existing) return false;

  execute(db, "DELETE FROM idea_tags WHERE idea_id = ?", [id]);
  execute(db, "DELETE FROM ideas WHERE id = ?", [id]);
  return true;
}

export function addIdeaTags(db: Database, ideaId: string, tags: string[]): void {
  for (const tag of tags) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) continue;
    try {
      execute(db, "INSERT INTO idea_tags (idea_id, tag) VALUES (?, ?)", [ideaId, trimmed]);
    } catch {
      // Tag already exists — ignore
    }
  }
}

export function removeIdeaTags(db: Database, ideaId: string, tags: string[]): void {
  for (const tag of tags) {
    execute(db, "DELETE FROM idea_tags WHERE idea_id = ? AND tag = ?", [
      ideaId,
      tag.trim().toLowerCase(),
    ]);
  }
}

export function getIdeasSummary(db: Database): IdeasSummary {
  const total = queryOne(db, "SELECT COUNT(*) as total FROM ideas")?.total ?? 0;
  const statusRows = queryAll(
    db,
    "SELECT status, COUNT(*) as count FROM ideas GROUP BY status",
  );

  const byStatus: Record<string, number> = {};
  for (const row of statusRows) {
    byStatus[row.status] = row.count;
  }

  return { total, byStatus };
}
