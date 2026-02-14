// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import { TerminalManager } from "../modules/terminal/pty.js";

const terminalManager = new TerminalManager();

export const terminalRoutes: FastifyPluginAsync = async (app) => {
  // Create a new terminal session
  app.post<{ Body: { cols?: number; rows?: number; shell?: string } }>(
    "/create",
    async (request) => {
      const { cols, rows, shell } = request.body || {};
      const session = terminalManager.create({ cols, rows, shell });
      return session;
    },
  );

  // List active sessions
  app.get("/sessions", async () => {
    return { sessions: terminalManager.list() };
  });

  // Kill a session
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params;
    const killed = terminalManager.kill(id);
    if (!killed) {
      return reply.status(404).send({ error: "Session not found" });
    }
    return { success: true };
  });
};

export { terminalManager };
