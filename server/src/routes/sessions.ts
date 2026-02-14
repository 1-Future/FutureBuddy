// Copyright 2025 #1 Future — Apache 2.0 License

import { homedir } from "node:os";
import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { loadConfig } from "../config.js";
import { getDb } from "../db/index.js";
import {
  listSessions,
  searchSessions,
  getSessionById,
  reindexAll,
} from "../modules/sessions/indexer.js";

const SESSIONS_DIR = process.env.SESSIONS_DIR || join(homedir(), ".claude", "projects");

export const sessionsRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // GET / — list indexed sessions (newest first, limit 50)
  app.get<{ Querystring: { limit?: string } }>("/", async (request) => {
    const limit = parseInt(request.query.limit || "50", 10);
    const sessions = listSessions(db, limit);
    return { sessions };
  });

  // GET /search?q=...&limit=... — search sessions
  app.get<{ Querystring: { q?: string; limit?: string } }>("/search", async (request) => {
    const { q, limit } = request.query;
    if (!q) return { results: [] };
    const results = searchSessions(db, q, parseInt(limit || "20", 10));
    return { results };
  });

  // GET /:id — get session detail with all entries
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const session = await getSessionById(db, request.params.id);
    if (!session) return reply.status(404).send({ error: "Session not found" });
    return { session };
  });

  // POST /reindex — trigger reindex of all session files
  app.post("/reindex", async () => {
    const count = await reindexAll(db, SESSIONS_DIR);
    return { indexed: count, directory: SESSIONS_DIR };
  });
};
