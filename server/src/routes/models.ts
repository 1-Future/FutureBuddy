// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import { loadConfig } from "../config.js";
import { OllamaManager } from "../modules/ai/ollama-manager.js";
import { getAIProvider, getAvailableProviders } from "../modules/ai/router.js";

export const modelsRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const ollama = new OllamaManager(config.ai.baseUrl);

  // GET /api/models — list installed models
  app.get("/", async () => {
    try {
      const models = await ollama.listModels();
      return { models };
    } catch {
      return { models: [], error: "Ollama not available" };
    }
  });

  // GET /api/models/running — list currently loaded/running models
  app.get("/running", async () => {
    try {
      const models = await ollama.getRunningModels();
      return { models };
    } catch {
      return { models: [], error: "Ollama not available" };
    }
  });

  // GET /api/models/providers — list available AI providers
  app.get("/providers", async () => {
    const providers = await getAvailableProviders(config.ai);
    return {
      current: config.ai.provider,
      currentModel: config.ai.model,
      providers,
    };
  });

  // GET /api/models/:name — get model details
  app.get<{ Params: { name: string } }>("/:name", async (request) => {
    const { name } = request.params;
    try {
      const info = await ollama.getModelInfo(name);
      return info;
    } catch (err) {
      return { error: `Failed to get model info: ${err}` };
    }
  });

  // POST /api/models/pull — pull/download a model (streaming progress)
  app.post<{ Body: { name: string } }>("/pull", async (request, reply) => {
    const { name } = request.body;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      await ollama.pullModel(name, (progress) => {
        reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
      });
      reply.raw.write(
        `data: ${JSON.stringify({ status: "success", done: true })}\n\n`,
      );
    } catch (err) {
      reply.raw.write(
        `data: ${JSON.stringify({ status: "error", error: String(err) })}\n\n`,
      );
    }

    reply.raw.end();
    return reply;
  });

  // DELETE /api/models/:name — delete a model
  app.delete<{ Params: { name: string } }>("/:name", async (request) => {
    const { name } = request.params;
    await ollama.deleteModel(name);
    return { deleted: name };
  });

  // POST /api/models/benchmark — benchmark a model
  app.post<{ Body: { name: string } }>("/benchmark", async (request) => {
    const { name } = request.body;
    const result = await ollama.benchmark(name);
    return result;
  });

  // GET /api/models/status — Ollama service status
  app.get("/status", async () => {
    const available = await ollama.isAvailable();
    return {
      ollama: available ? "running" : "offline",
      baseUrl: config.ai.baseUrl,
    };
  });
};
