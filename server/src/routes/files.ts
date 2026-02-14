// Copyright 2025 #1 Future — Apache 2.0 License

import { readdir, stat, readFile } from "node:fs/promises";
import { join, dirname, extname, resolve } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { FileEntry, FileListResponse, FileReadResponse } from "@futurebuddy/shared";

export const filesRoutes: FastifyPluginAsync = async (app) => {
  // List directory contents
  app.get<{ Querystring: { path?: string } }>("/list", async (request) => {
    const requestedPath = request.query.path || "C:\\";
    const resolvedPath = resolve(requestedPath);

    const entries: FileEntry[] = [];
    const dirEntries = await readdir(resolvedPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      try {
        const fullPath = join(resolvedPath, entry.name);
        const stats = await stat(fullPath).catch(() => null);
        if (!stats) continue;

        entries.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? "directory" : "file",
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: entry.isFile() ? extname(entry.name) : undefined,
        });
      } catch {
        // Skip entries we can't access
      }
    }

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const parent = dirname(resolvedPath);
    const response: FileListResponse = {
      path: resolvedPath,
      entries,
      parent: parent !== resolvedPath ? parent : null,
    };

    return response;
  });

  // Read file contents
  app.get<{ Querystring: { path: string } }>("/read", async (request, reply) => {
    const { path: filePath } = request.query;
    if (!filePath) {
      return reply.status(400).send({ error: "path is required" });
    }

    const resolvedPath = resolve(filePath);
    const stats = await stat(resolvedPath);

    // Limit file size to 5MB for reading
    if (stats.size > 5 * 1024 * 1024) {
      return reply.status(413).send({ error: "File too large (max 5MB)" });
    }

    const content = await readFile(resolvedPath, "utf-8");

    const response: FileReadResponse = {
      path: resolvedPath,
      content,
      encoding: "utf-8",
      size: stats.size,
    };

    return response;
  });
};
