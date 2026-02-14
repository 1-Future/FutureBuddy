// Copyright 2025 #1 Future — Apache 2.0 License

import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { APP_NAME, SLOGAN, VERSION, WS_PATH } from "@futurebuddy/shared";
import { loadConfig } from "./config.js";
import { getDb, closeDb } from "./db/index.js";
import { chatRoutes } from "./routes/chat.js";
import { filesRoutes } from "./routes/files.js";
import { systemRoutes } from "./routes/system.js";
import { actionsRoutes } from "./routes/actions.js";
import { terminalRoutes } from "./routes/terminal.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { memoryRoutes } from "./routes/memory.js";
import { sessionsRoutes } from "./routes/sessions.js";
import { docsRoutes } from "./routes/docs.js";
import { bookmarksRoutes } from "./routes/bookmarks.js";
import { modelsRoutes } from "./routes/models.js";
import { nudgeRoutes } from "./routes/nudge.js";
import { wsHandler } from "./routes/ws.js";

const config = loadConfig();

// Init database (creates data dir and DB file)
await getDb(config.dbPath);

const app = Fastify({
  logger: {
    level: "info",
  },
});

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
});

await app.register(websocket);

// Health check
app.get("/", async () => ({
  name: APP_NAME,
  slogan: SLOGAN,
  version: VERSION,
  status: "running",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

// Lightweight health probe for Docker
app.get("/health", async (_, reply) => {
  reply.code(200).send({ status: "ok" });
});

// API routes
await app.register(chatRoutes, { prefix: "/api/chat" });
await app.register(filesRoutes, { prefix: "/api/files" });
await app.register(systemRoutes, { prefix: "/api/system" });
await app.register(actionsRoutes, { prefix: "/api/actions" });
await app.register(terminalRoutes, { prefix: "/api/terminal" });
await app.register(inventoryRoutes, { prefix: "/api/inventory" });
await app.register(memoryRoutes, { prefix: "/api/memory" });
await app.register(sessionsRoutes, { prefix: "/api/sessions" });
await app.register(docsRoutes, { prefix: "/api/docs" });
await app.register(bookmarksRoutes, { prefix: "/api/bookmarks" });
await app.register(modelsRoutes, { prefix: "/api/models" });
await app.register(nudgeRoutes, { prefix: "/api/nudges" });

// WebSocket
await app.register(wsHandler, { prefix: WS_PATH });

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down...");
  closeDb();
  await app.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`\n  ${APP_NAME} v${VERSION} — ${SLOGAN}`);
  console.log(`  Server running on http://${config.host}:${config.port}`);
  console.log(`  AI Provider: ${config.ai.provider} (${config.ai.model})\n`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
