// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import type { ToolDomain } from "@futurebuddy/shared";
import { loadConfig } from "../config.js";
import { getDb } from "../db/index.js";
import { toolRegistry } from "../modules/it-department/tool-registry.js";

export const toolsRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // List all known tools
  app.get("/", async () => {
    return { tools: toolRegistry.getAllTools() };
  });

  // List installed tools only
  app.get("/installed", async () => {
    return { tools: toolRegistry.getInstalledTools() };
  });

  // Scan for tools (re-detect)
  app.post("/scan", async () => {
    const tools = await toolRegistry.scanTools(db);
    return { tools };
  });

  // List available operations (from installed tools)
  app.get("/operations", async () => {
    return { operations: toolRegistry.getOperations() };
  });

  // Execute a tool operation directly
  app.post<{
    Body: { domain: ToolDomain; intent: string; params?: Record<string, string> };
  }>("/execute", async (request, reply) => {
    const { domain, intent, params = {} } = request.body;

    const orchestrator = toolRegistry.getOrchestrator(domain);
    if (!orchestrator) {
      return reply.status(400).send({ error: `Unknown domain: ${domain}` });
    }

    const result = await toolRegistry.executeIntent(domain, intent, params, db);
    return result;
  });
};
