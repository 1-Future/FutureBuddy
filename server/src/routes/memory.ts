// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import type { MemoryCategory } from "@futurebuddy/shared";
import { loadConfig } from "../config.js";
import { getDb } from "../db/index.js";
import {
  createMemory,
  getMemory,
  getAllMemories,
  searchMemories,
  updateMemory,
  deleteMemory,
  getMemoryStats,
  type CreateMemoryData,
} from "../modules/memory/manager.js";

export const memoryRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // List all memories (optionally filter by category)
  app.get<{ Querystring: { category?: string } }>("/", async (request) => {
    const memories = getAllMemories(db, request.query.category as MemoryCategory | undefined);
    return { memories };
  });

  // Memory stats
  app.get("/stats", async () => {
    return getMemoryStats(db);
  });

  // Semantic search memories
  app.get<{ Querystring: { q: string; limit?: string } }>("/search", async (request) => {
    const { q, limit } = request.query;
    if (!q) return { results: [] };
    const results = await searchMemories(db, q, config.ai, parseInt(limit || "10", 10));
    return { results };
  });

  // Get single memory
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const memory = getMemory(db, request.params.id);
    if (!memory) return reply.status(404).send({ error: "Memory not found" });
    return memory;
  });

  // Create a memory manually
  app.post<{ Body: CreateMemoryData }>("/", async (request) => {
    const memory = await createMemory(db, { ...request.body, source: "manual" }, config.ai);
    return memory;
  });

  // Update a memory
  app.patch<{ Params: { id: string }; Body: Partial<CreateMemoryData> }>(
    "/:id",
    async (request, reply) => {
      const memory = updateMemory(db, request.params.id, request.body);
      if (!memory) return reply.status(404).send({ error: "Memory not found" });
      return memory;
    },
  );

  // Delete a memory
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = deleteMemory(db, request.params.id);
    if (!deleted) return reply.status(404).send({ error: "Memory not found" });
    return { success: true };
  });
};
