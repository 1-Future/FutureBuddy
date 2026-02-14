// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import { loadConfig } from "../config.js";
import { getDb } from "../db/index.js";
import { analyzeForNudges } from "../modules/nudge/analyzer.js";
import {
  ensureNudgeTable,
  createNudge,
  getNudges,
  resolveNudge,
  getNudgeStats,
  type NudgeStatus,
} from "../modules/nudge/notifier.js";

export const nudgeRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // Ensure the nudges table exists
  ensureNudgeTable(db);

  // List nudges (optional status filter and limit)
  app.get<{
    Querystring: { status?: string; limit?: string };
  }>("/", async (request) => {
    const { status, limit } = request.query;
    const nudges = getNudges(
      db,
      status as NudgeStatus | undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { nudges };
  });

  // Get pending nudges
  app.get("/pending", async () => {
    const nudges = getNudges(db, "pending");
    return { nudges };
  });

  // Get nudge statistics
  app.get("/stats", async () => {
    return getNudgeStats(db);
  });

  // Analyze text for nudge-worthy content
  app.post<{ Body: { text: string } }>("/analyze", async (request, reply) => {
    const { text } = request.body;
    if (!text) {
      return reply.status(400).send({ error: "text is required" });
    }

    const candidates = analyzeForNudges(text);

    // Persist all candidates as pending nudges
    const nudges = candidates.map((candidate) => createNudge(db, candidate));

    return { nudges, count: nudges.length };
  });

  // Resolve a nudge (accept, snooze, or dismiss)
  app.post<{
    Params: { id: string };
    Body: { status: string };
  }>("/:id/resolve", async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;

    const validStatuses: NudgeStatus[] = ["accepted", "snoozed", "dismissed"];
    if (!validStatuses.includes(status as NudgeStatus)) {
      return reply.status(400).send({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const nudge = resolveNudge(db, id, status as NudgeStatus);
    if (!nudge) {
      return reply.status(404).send({ error: "Nudge not found" });
    }

    return nudge;
  });
};
