// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { SummarizeRequest } from "@futurebuddy/shared";
import { getDb } from "../db/index.js";
import { loadConfig } from "../config.js";
import { summarize, summarizeStream, initSummarizeModule } from "../modules/summarize/index.js";

export const summarizeRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // Clean expired summaries at startup
  initSummarizeModule(db);

  // Summarize a URL (non-streaming)
  app.post<{ Body: SummarizeRequest }>("/", async (request) => {
    const { url, length = "medium" } = request.body;

    if (!url || typeof url !== "string") {
      return { error: "missing_url", message: "A valid URL is required" };
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return { error: "invalid_url", message: "The provided URL is not valid" };
    }

    if (!["short", "medium", "long"].includes(length)) {
      return { error: "invalid_length", message: "Length must be short, medium, or long" };
    }

    try {
      const result = await summarize(url, length, db, config.ai);
      return result;
    } catch (err: any) {
      return {
        error: "summarize_failed",
        message: err.message || "Failed to summarize the URL",
      };
    }
  });

  // Summarize a URL (SSE streaming)
  app.post<{ Body: SummarizeRequest }>("/stream", async (request, reply: FastifyReply) => {
    const { url, length = "medium" } = request.body;

    if (!url || typeof url !== "string") {
      return { error: "missing_url", message: "A valid URL is required" };
    }

    try {
      new URL(url);
    } catch {
      return { error: "invalid_url", message: "The provided URL is not valid" };
    }

    if (!["short", "medium", "long"].includes(length)) {
      return { error: "invalid_length", message: "Length must be short, medium, or long" };
    }

    // Set up SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      const result = await summarizeStream(url, length, db, config.ai, (chunk: string) => {
        reply.raw.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      });

      // Send final done event with metadata
      reply.raw.write(
        `data: ${JSON.stringify({
          done: true,
          title: result.title,
          source: result.source,
          type: result.type,
          wordCount: result.wordCount,
          cached: result.cached,
        })}\n\n`,
      );
    } catch (err: any) {
      reply.raw.write(
        `data: ${JSON.stringify({ error: err.message || "Failed to summarize" })}\n\n`,
      );
    }

    reply.raw.end();
    return reply;
  });
};
