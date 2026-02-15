// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import type { Action } from "@futurebuddy/shared";
import { loadConfig } from "../config.js";
import { getDb, queryAll, queryOne, execute } from "../db/index.js";
import { executeAction } from "../modules/it-department/action-executor.js";

export const actionsRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // Get pending actions
  app.get("/pending", async () => {
    const actions = queryAll(
      db,
      "SELECT * FROM actions WHERE status = 'pending' ORDER BY created_at DESC",
    ) as Action[];
    return { actions };
  });

  // Get all actions (with optional status filter)
  app.get<{ Querystring: { status?: string; limit?: string } }>("/", async (request) => {
    const { status, limit } = request.query;
    let query = "SELECT * FROM actions";
    const params: any[] = [];

    if (status) {
      query += " WHERE status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(parseInt(limit || "50", 10));

    const actions = queryAll(db, query, params) as Action[];
    return { actions };
  });

  // Approve or deny an action
  app.post<{ Params: { id: string }; Body: { approved: boolean } }>(
    "/:id/resolve",
    async (request, reply) => {
      const { id } = request.params;
      const { approved } = request.body;

      const action = queryOne(db, "SELECT * FROM actions WHERE id = ?", [id]) as Action | undefined;

      if (!action) {
        return reply.status(404).send({ error: "Action not found" });
      }

      if (action.status !== "pending") {
        return reply.status(400).send({ error: `Action already ${action.status}` });
      }

      if (!approved) {
        execute(
          db,
          "UPDATE actions SET status = 'denied', resolved_at = datetime('now') WHERE id = ?",
          [id],
        );
        return { ...action, status: "denied" };
      }

      // Execute the action
      const result = await executeAction(action, db);

      execute(
        db,
        "UPDATE actions SET status = ?, result = ?, error = ?, resolved_at = datetime('now') WHERE id = ?",
        [result.success ? "executed" : "failed", result.output || null, result.error || null, id],
      );

      return {
        ...action,
        status: result.success ? "executed" : "failed",
        result: result.output,
        error: result.error,
      };
    },
  );
};
