import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import {
  createMemory,
  getMemory,
  getAllMemories,
  updateMemory,
  deleteMemory,
  getMemoryStats,
} from "./manager.js";

let db: Database;

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'fact',
      importance REAL NOT NULL DEFAULT 0.5,
      embedding TEXT,
      source TEXT NOT NULL DEFAULT 'conversation',
      source_id TEXT,
      last_accessed TEXT,
      access_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
});

afterEach(() => {
  db.close();
});

describe("createMemory", () => {
  it("creates a memory with minimal data", async () => {
    const mem = await createMemory(db, { content: "User lives in Cleveland" });
    expect(mem.id).toBeDefined();
    expect(mem.content).toBe("User lives in Cleveland");
    expect(mem.category).toBe("fact");
    expect(mem.importance).toBe(0.5);
    expect(mem.source).toBe("conversation");
    expect(mem.accessCount).toBe(0);
  });

  it("creates a memory with all fields", async () => {
    const mem = await createMemory(db, {
      content: "User prefers TypeScript over JavaScript",
      category: "preference",
      importance: 0.8,
      source: "manual",
      sourceId: "conv-123",
    });
    expect(mem.category).toBe("preference");
    expect(mem.importance).toBe(0.8);
    expect(mem.source).toBe("manual");
    expect(mem.sourceId).toBe("conv-123");
  });
});

describe("getMemory", () => {
  it("returns undefined for non-existent memory", () => {
    expect(getMemory(db, "nope")).toBeUndefined();
  });

  it("retrieves a created memory", async () => {
    const created = await createMemory(db, { content: "Test" });
    const fetched = getMemory(db, created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.content).toBe("Test");
  });
});

describe("getAllMemories", () => {
  it("returns all memories", async () => {
    await createMemory(db, { content: "Fact 1", category: "fact" });
    await createMemory(db, { content: "Pref 1", category: "preference" });
    const all = getAllMemories(db);
    expect(all).toHaveLength(2);
  });

  it("filters by category", async () => {
    await createMemory(db, { content: "Fact 1", category: "fact" });
    await createMemory(db, { content: "Pref 1", category: "preference" });
    const facts = getAllMemories(db, "fact");
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe("fact");
  });
});

describe("updateMemory", () => {
  it("updates content and category", async () => {
    const mem = await createMemory(db, { content: "Old", category: "fact" });
    const updated = updateMemory(db, mem.id, { content: "New", category: "preference" });
    expect(updated!.content).toBe("New");
    expect(updated!.category).toBe("preference");
  });

  it("returns undefined for non-existent memory", () => {
    expect(updateMemory(db, "nope", { content: "X" })).toBeUndefined();
  });

  it("updates importance", async () => {
    const mem = await createMemory(db, { content: "Important", importance: 0.3 });
    const updated = updateMemory(db, mem.id, { importance: 0.9 });
    expect(updated!.importance).toBe(0.9);
  });
});

describe("deleteMemory", () => {
  it("deletes an existing memory", async () => {
    const mem = await createMemory(db, { content: "Doomed" });
    expect(deleteMemory(db, mem.id)).toBe(true);
    expect(getMemory(db, mem.id)).toBeUndefined();
  });

  it("returns false for non-existent memory", () => {
    expect(deleteMemory(db, "nope")).toBe(false);
  });
});

describe("getMemoryStats", () => {
  it("returns zeros for empty table", () => {
    const stats = getMemoryStats(db);
    expect(stats.total).toBe(0);
    expect(stats.withEmbeddings).toBe(0);
    expect(stats.byCategory).toEqual({});
  });

  it("aggregates correctly", async () => {
    await createMemory(db, { content: "Fact", category: "fact" });
    await createMemory(db, { content: "Fact 2", category: "fact" });
    await createMemory(db, { content: "Pref", category: "preference" });

    const stats = getMemoryStats(db);
    expect(stats.total).toBe(3);
    expect(stats.byCategory.fact).toBe(2);
    expect(stats.byCategory.preference).toBe(1);
    expect(stats.withEmbeddings).toBe(0); // No AI config provided, so no embeddings
  });
});
