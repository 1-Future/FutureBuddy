// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import type { Database } from "sql.js";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { getDb, queryAll, queryOne, execute } from "../db/index.js";
import { getAIProvider } from "../modules/ai/router.js";
import { parseSessionFile } from "../modules/sessions/parser.js";
import { scrubSession } from "../modules/autotube/scrubber.js";
import {
  generateScriptPrompt,
  parseScriptResponse,
} from "../modules/autotube/scriptwriter.js";

function ensureTable(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS autotube_projects (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    script TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','scripted','approved','rendering','published')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
}

export const autotubeRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);
  ensureTable(db);

  // GET /api/autotube — list projects
  app.get("/", async () => {
    const projects = queryAll(
      db,
      "SELECT * FROM autotube_projects ORDER BY created_at DESC LIMIT 50",
    );
    return { projects };
  });

  // GET /api/autotube/:id — get project detail
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const project = queryOne(
      db,
      "SELECT * FROM autotube_projects WHERE id = ?",
      [request.params.id],
    );
    if (!project) return { error: "Not found" };
    return { project };
  });

  // POST /api/autotube/create — create a project from a session file
  app.post<{ Body: { sessionPath: string } }>("/create", async (request) => {
    const { sessionPath } = request.body;
    const session = await parseSessionFile(sessionPath);
    const scrubbed = scrubSession(session);

    const id = randomUUID();
    execute(
      db,
      "INSERT INTO autotube_projects (id, session_id, title, description) VALUES (?, ?, ?, ?)",
      [id, session.id, scrubbed.summary, `Tutorial from session: ${scrubbed.summary}`],
    );

    return { id, sessionId: session.id, summary: scrubbed.summary };
  });

  // POST /api/autotube/script — generate AI script
  app.post<{ Body: { id: string; sessionPath: string } }>("/script", async (request) => {
    const { id, sessionPath } = request.body;
    const session = await parseSessionFile(sessionPath);
    const scrubbed = scrubSession(session);

    const prompt = generateScriptPrompt(scrubbed);
    const provider = getAIProvider(config.ai);
    const response = await provider.chat(
      [{ role: "user", content: prompt, timestamp: new Date().toISOString() }],
      config.ai,
    );

    const script = parseScriptResponse(response);

    execute(
      db,
      "UPDATE autotube_projects SET script = ?, title = ?, status = 'scripted', updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(script), script.title, id],
    );

    return { script };
  });

  // POST /api/autotube/:id/approve — approve a project for rendering
  app.post<{ Params: { id: string } }>("/:id/approve", async (request) => {
    execute(
      db,
      "UPDATE autotube_projects SET status = 'approved', updated_at = datetime('now') WHERE id = ?",
      [request.params.id],
    );
    return { status: "approved" };
  });

  // DELETE /api/autotube/:id — delete a project
  app.delete<{ Params: { id: string } }>("/:id", async (request) => {
    execute(db, "DELETE FROM autotube_projects WHERE id = ?", [request.params.id]);
    return { deleted: true };
  });
};
