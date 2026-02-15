// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import { loadConfig } from "../config.js";
import { getDb } from "../db/index.js";
import {
  createIdea,
  getIdea,
  searchIdeas,
  updateIdea,
  deleteIdea,
  addIdeaTags,
  removeIdeaTags,
  getIdeasSummary,
  type CreateIdeaData,
  type UpdateIdeaData,
} from "../modules/ideas/manager.js";

export const ideasRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // List / search ideas
  app.get<{
    Querystring: { query?: string; status?: string; tag?: string };
  }>("/", async (request) => {
    const q = request.query;
    const ideas = searchIdeas(db, {
      query: q.query,
      status: q.status,
      tag: q.tag,
    });
    return { ideas };
  });

  // Summary stats
  app.get("/summary", async () => {
    return getIdeasSummary(db);
  });

  // Get single idea
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const idea = getIdea(db, request.params.id);
    if (!idea) return reply.status(404).send({ error: "Idea not found" });
    return idea;
  });

  // Create idea
  app.post<{ Body: CreateIdeaData }>("/", async (request) => {
    return createIdea(db, request.body);
  });

  // Update idea
  app.patch<{ Params: { id: string }; Body: UpdateIdeaData }>("/:id", async (request, reply) => {
    const idea = updateIdea(db, request.params.id, request.body);
    if (!idea) return reply.status(404).send({ error: "Idea not found" });
    return idea;
  });

  // Delete idea
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = deleteIdea(db, request.params.id);
    if (!deleted) return reply.status(404).send({ error: "Idea not found" });
    return { success: true };
  });

  // Add tags
  app.post<{ Params: { id: string }; Body: { tags: string[] } }>("/:id/tags", async (request, reply) => {
    const idea = getIdea(db, request.params.id);
    if (!idea) return reply.status(404).send({ error: "Idea not found" });
    addIdeaTags(db, request.params.id, request.body.tags);
    return getIdea(db, request.params.id);
  });

  // Remove tag
  app.delete<{ Params: { id: string; tag: string } }>("/:id/tags/:tag", async (request, reply) => {
    const idea = getIdea(db, request.params.id);
    if (!idea) return reply.status(404).send({ error: "Idea not found" });
    removeIdeaTags(db, request.params.id, [request.params.tag]);
    return getIdea(db, request.params.id);
  });
};
