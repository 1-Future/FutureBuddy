// Copyright 2025 #1 Future — Apache 2.0 License

import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import type { Database } from "sql.js";
import { loadConfig } from "../config.js";
import { getDb, queryAll, queryOne, execute } from "../db/index.js";
import { extractUrls } from "../modules/bookmarks/extractor.js";
import { categorizeUrl } from "../modules/bookmarks/categorizer.js";

function ensureTable(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      category TEXT DEFAULT 'other',
      context TEXT,
      source TEXT DEFAULT 'manual',
      source_id TEXT,
      visit_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category)`);
}

export const bookmarksRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);
  ensureTable(db);

  // GET / — list all bookmarks with optional category filter and search
  app.get<{
    Querystring: { category?: string; query?: string };
  }>("/", async (request) => {
    const { category, query } = request.query;
    let sql = "SELECT * FROM bookmarks";
    const conditions: string[] = [];
    const params: any[] = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (query) {
      conditions.push("(url LIKE ? OR title LIKE ? OR context LIKE ?)");
      const like = `%${query}%`;
      params.push(like, like, like);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY updated_at DESC";

    const bookmarks = queryAll(db, sql, params);
    return { bookmarks };
  });

  // GET /stats — count by category
  app.get("/stats", async () => {
    const rows = queryAll(db, "SELECT category, COUNT(*) as count FROM bookmarks GROUP BY category");
    const total = queryOne(db, "SELECT COUNT(*) as count FROM bookmarks");
    const byCategory: Record<string, number> = {};
    for (const row of rows) {
      byCategory[row.category as string] = row.count as number;
    }
    return { total: (total?.count as number) || 0, byCategory };
  });

  // POST / — add a bookmark manually
  app.post<{
    Body: { url: string; title?: string; category?: string };
  }>("/", async (request, reply) => {
    const { url, title, category } = request.body;

    if (!url) {
      return reply.status(400).send({ error: "url is required" });
    }

    // Check if URL already exists
    const existing = queryOne(db, "SELECT * FROM bookmarks WHERE url = ?", [url]);
    if (existing) {
      execute(
        db,
        "UPDATE bookmarks SET visit_count = visit_count + 1, updated_at = datetime('now') WHERE url = ?",
        [url],
      );
      const updated = queryOne(db, "SELECT * FROM bookmarks WHERE url = ?", [url]);
      return updated;
    }

    const id = randomUUID();
    const cat = category || categorizeUrl(url);
    execute(
      db,
      "INSERT INTO bookmarks (id, url, title, category, source) VALUES (?, ?, ?, ?, 'manual')",
      [id, url, title || null, cat],
    );

    const bookmark = queryOne(db, "SELECT * FROM bookmarks WHERE id = ?", [id]);
    return bookmark;
  });

  // POST /extract — extract bookmarks from text
  app.post<{
    Body: { text: string; source?: "session" | "chat" | "manual"; sourceId?: string };
  }>("/extract", async (request, reply) => {
    const { text, source, sourceId } = request.body;

    if (!text) {
      return reply.status(400).send({ error: "text is required" });
    }

    const extracted = extractUrls(text, source || "manual", sourceId);
    const results: any[] = [];

    for (const item of extracted) {
      const existing = queryOne(db, "SELECT * FROM bookmarks WHERE url = ?", [item.url]);

      if (existing) {
        execute(
          db,
          "UPDATE bookmarks SET visit_count = visit_count + 1, updated_at = datetime('now') WHERE url = ?",
          [item.url],
        );
        const updated = queryOne(db, "SELECT * FROM bookmarks WHERE url = ?", [item.url]);
        results.push(updated);
      } else {
        const id = randomUUID();
        const category = categorizeUrl(item.url);
        execute(
          db,
          "INSERT INTO bookmarks (id, url, title, category, context, source, source_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [id, item.url, item.title || null, category, item.context || null, item.source, item.sourceId || null],
        );
        const bookmark = queryOne(db, "SELECT * FROM bookmarks WHERE id = ?", [id]);
        results.push(bookmark);
      }
    }

    return { extracted: results, count: results.length };
  });

  // DELETE /:id — delete a bookmark
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const existing = queryOne(db, "SELECT * FROM bookmarks WHERE id = ?", [request.params.id]);
    if (!existing) {
      return reply.status(404).send({ error: "Bookmark not found" });
    }
    execute(db, "DELETE FROM bookmarks WHERE id = ?", [request.params.id]);
    return { success: true };
  });
};
