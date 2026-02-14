// Copyright 2025 #1 Future — Apache 2.0 License

import { getServerUrl } from "./api";

type MessageHandler = (data: any) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<MessageHandler>>();

export function connectWebSocket() {
  const url = getServerUrl().replace(/^http/, "ws") + "/ws";

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[WS] Connected");
    emit("connection", { connected: true });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      emit(msg.type, msg);
    } catch (err) {
      console.error("[WS] Parse error:", err);
    }
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected");
    emit("connection", { connected: false });

    // Reconnect after 3 seconds
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
  };
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function sendWsMessage(type: string, payload: any, sessionId?: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, sessionId }));
  }
}

export function onWsMessage(type: string, handler: MessageHandler) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(handler);

  return () => {
    listeners.get(type)?.delete(handler);
  };
}

function emit(type: string, data: any) {
  listeners.get(type)?.forEach((handler) => handler(data));
}
