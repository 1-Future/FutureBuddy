// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import type {
  WSMessage,
  TerminalDataPayload,
  TerminalResizePayload,
  ActionResponsePayload,
} from "@futurebuddy/shared";
import { terminalManager } from "./terminal.js";
import { loadConfig } from "../config.js";
import { getDb, queryOne, execute } from "../db/index.js";
import { executeAction } from "../modules/it-department/action-executor.js";

export const wsHandler: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  app.get("/", { websocket: true }, (socket, _request) => {
    app.log.info("WebSocket client connected");

    socket.on("message", async (raw: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(raw.toString());

        switch (msg.type) {
          case "terminal:data": {
            const { data } = msg.payload as TerminalDataPayload;
            if (msg.sessionId) {
              terminalManager.write(msg.sessionId, data);
            }
            break;
          }

          case "terminal:resize": {
            const { cols, rows } = msg.payload as TerminalResizePayload;
            if (msg.sessionId) {
              terminalManager.resize(msg.sessionId, cols, rows);
            }
            break;
          }

          case "action:response": {
            const { actionId, approved } = msg.payload as ActionResponsePayload;
            const action = queryOne(db, "SELECT * FROM actions WHERE id = ?", [actionId]);

            if (action && action.status === "pending") {
              if (!approved) {
                execute(
                  db,
                  "UPDATE actions SET status = 'denied', resolved_at = datetime('now') WHERE id = ?",
                  [actionId],
                );
              } else {
                const result = await executeAction(action, db);
                execute(
                  db,
                  "UPDATE actions SET status = ?, result = ?, error = ?, resolved_at = datetime('now') WHERE id = ?",
                  [
                    result.success ? "executed" : "failed",
                    result.output || null,
                    result.error || null,
                    actionId,
                  ],
                );
              }
            }
            break;
          }
        }
      } catch (err) {
        app.log.error(err, "WebSocket message error");
      }
    });

    // Set up terminal output forwarding
    const forwardTerminalOutput = (sessionId: string, data: string) => {
      const msg: WSMessage<TerminalDataPayload> = {
        type: "terminal:data",
        sessionId,
        payload: { data },
      };
      socket.send(JSON.stringify(msg));
    };

    terminalManager.onOutput(forwardTerminalOutput);

    socket.on("close", () => {
      app.log.info("WebSocket client disconnected");
      terminalManager.offOutput(forwardTerminalOutput);
    });
  });
};
