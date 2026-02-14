// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type { AIConfig, Memory, MemoryCategory, MemorySearchResult } from "@futurebuddy/shared";
import { queryAll, queryOne, execute } from "../../db/index.js";
import { randomUUID } from "node:crypto";
import { getEmbedding, cosineSimilarity } from "./embeddings.js";

export interface CreateMemoryData {
  content: string;
  category?: MemoryCategory;
  importance?: number;
  source?: Memory["source"];
  sourceId?: string;
}

function rowToMemory(row: any): Memory {
  return {
    id: row.id,
    content: row.content,
    category: row.category as MemoryCategory,
    importance: row.importance,
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    source: row.source,
    sourceId: row.source_id || undefined,
    lastAccessed: row.last_accessed || undefined,
    accessCount: row.access_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createMemory(
  db: Database,
  data: CreateMemoryData,
  config?: AIConfig,
): Promise<Memory> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Generate embedding if AI config is available
  let embedding: number[] | null = null;
  if (config) {
    try {
      embedding = await getEmbedding(data.content, config);
    } catch {
      // Embedding generation failed — store without it
    }
  }

  execute(
    db,
    `INSERT INTO memories (id, content, category, importance, embedding, source, source_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.content,
      data.category ?? "fact",
      data.importance ?? 0.5,
      embedding ? JSON.stringify(embedding) : null,
      data.source ?? "conversation",
      data.sourceId ?? null,
      now,
      now,
    ],
  );

  return getMemory(db, id)!;
}

export function getMemory(db: Database, id: string): Memory | undefined {
  const row = queryOne(db, "SELECT * FROM memories WHERE id = ?", [id]);
  if (!row) return undefined;
  return rowToMemory(row);
}

export async function searchMemories(
  db: Database,
  query: string,
  config: AIConfig,
  limit = 10,
): Promise<MemorySearchResult[]> {
  // Get all memories with embeddings
  const rows = queryAll(db, "SELECT * FROM memories WHERE embedding IS NOT NULL");

  if (rows.length === 0) return [];

  // Generate query embedding
  let queryEmbedding: number[];
  try {
    queryEmbedding = await getEmbedding(query, config);
  } catch {
    // If embedding fails, fall back to text search
    return textSearchMemories(db, query, limit);
  }

  // Compute cosine similarity for each memory
  const scored: MemorySearchResult[] = [];
  for (const row of rows) {
    const memoryEmbedding = JSON.parse(row.embedding);
    const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
    if (similarity > 0.3) {
      scored.push({ memory: rowToMemory(row), similarity });
    }
  }

  // Sort by similarity (descending), then by importance
  scored.sort((a, b) => {
    const simDiff = b.similarity - a.similarity;
    if (Math.abs(simDiff) > 0.05) return simDiff;
    return b.memory.importance - a.memory.importance;
  });

  // Boost access count for returned memories
  const results = scored.slice(0, limit);
  for (const r of results) {
    execute(
      db,
      "UPDATE memories SET access_count = access_count + 1, last_accessed = datetime('now') WHERE id = ?",
      [r.memory.id],
    );
  }

  return results;
}

function textSearchMemories(db: Database, query: string, limit: number): MemorySearchResult[] {
  const like = `%${query}%`;
  const rows = queryAll(
    db,
    "SELECT * FROM memories WHERE content LIKE ? ORDER BY importance DESC LIMIT ?",
    [like, limit],
  );
  return rows.map((row: any) => ({
    memory: rowToMemory(row),
    similarity: 0.5, // Default similarity for text matches
  }));
}

export function getAllMemories(db: Database, category?: MemoryCategory): Memory[] {
  if (category) {
    return queryAll(db, "SELECT * FROM memories WHERE category = ? ORDER BY importance DESC, updated_at DESC", [category])
      .map(rowToMemory);
  }
  return queryAll(db, "SELECT * FROM memories ORDER BY importance DESC, updated_at DESC")
    .map(rowToMemory);
}

export function updateMemory(
  db: Database,
  id: string,
  updates: Partial<Pick<CreateMemoryData, "content" | "category" | "importance">>,
): Memory | undefined {
  const existing = queryOne(db, "SELECT id FROM memories WHERE id = ?", [id]);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.content !== undefined) {
    fields.push("content = ?");
    values.push(updates.content);
  }
  if (updates.category !== undefined) {
    fields.push("category = ?");
    values.push(updates.category);
  }
  if (updates.importance !== undefined) {
    fields.push("importance = ?");
    values.push(updates.importance);
  }

  if (fields.length === 0) return getMemory(db, id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  execute(db, `UPDATE memories SET ${fields.join(", ")} WHERE id = ?`, values);
  return getMemory(db, id);
}

export function deleteMemory(db: Database, id: string): boolean {
  const existing = queryOne(db, "SELECT id FROM memories WHERE id = ?", [id]);
  if (!existing) return false;
  execute(db, "DELETE FROM memories WHERE id = ?", [id]);
  return true;
}

export function getMemoryStats(db: Database): {
  total: number;
  byCategory: Record<string, number>;
  withEmbeddings: number;
} {
  const total = queryOne(db, "SELECT COUNT(*) as count FROM memories")?.count ?? 0;
  const withEmbeddings = queryOne(db, "SELECT COUNT(*) as count FROM memories WHERE embedding IS NOT NULL")?.count ?? 0;

  const catRows = queryAll(db, "SELECT category, COUNT(*) as count FROM memories GROUP BY category");
  const byCategory: Record<string, number> = {};
  for (const row of catRows) {
    byCategory[row.category] = row.count;
  }

  return { total, byCategory, withEmbeddings };
}

// Check if a similar memory already exists (to avoid duplicates)
export async function findDuplicate(
  db: Database,
  content: string,
  config: AIConfig,
): Promise<Memory | undefined> {
  const results = await searchMemories(db, content, config, 1);
  if (results.length > 0 && results[0].similarity > 0.9) {
    return results[0].memory;
  }
  return undefined;
}
