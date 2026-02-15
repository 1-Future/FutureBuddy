// WebSocket client for the new FutureBuddy server protocol

import { useConnectionStore } from '../stores/connection.store';
import type { WSMessage, WSMessageType, TerminalDataPayload, TerminalResizePayload, ActionResponsePayload } from '../types/ws';

type Listener<T = unknown> = (payload: T, sessionId?: string) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners = new Map<WSMessageType, Set<Listener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30_000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;

  connect() {
    const { serverUrl } = useConnectionStore.getState();
    if (!serverUrl) return;

    this.intentionalClose = false;
    useConnectionStore.getState().setWSState('connecting');

    const protocol = serverUrl.startsWith('https') ? 'wss' : 'ws';
    const cleanHost = serverUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const url = `${protocol}://${cleanHost}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      useConnectionStore.getState().setWSState('connected');
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data as string);
        this.emit(msg.type, msg.payload, msg.sessionId);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.cleanup();
      useConnectionStore.getState().setWSState('disconnected');
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  disconnect() {
    this.intentionalClose = true;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useConnectionStore.getState().setWSState('disconnected');
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);
  }

  private send<T>(type: WSMessageType, payload: T, sessionId?: string) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const msg: WSMessage<T> = { type, payload, sessionId };
    this.ws.send(JSON.stringify(msg));
  }

  // --- Public send methods ---

  sendTerminalData(sessionId: string, data: string) {
    this.send<TerminalDataPayload>('terminal:data', { data }, sessionId);
  }

  sendTerminalResize(sessionId: string, cols: number, rows: number) {
    this.send<TerminalResizePayload>('terminal:resize', { cols, rows }, sessionId);
  }

  sendActionResponse(actionId: string, approved: boolean) {
    this.send<ActionResponsePayload>('action:response', { actionId, approved });
  }

  // --- Event listeners ---

  on<T = unknown>(type: WSMessageType, listener: Listener<T>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as Listener);
    return () => this.off(type, listener);
  }

  off<T = unknown>(type: WSMessageType, listener: Listener<T>) {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  private emit(type: WSMessageType, payload: unknown, sessionId?: string) {
    this.listeners.get(type)?.forEach((fn) => fn(payload, sessionId));
  }
}

// Singleton
export const wsManager = new WebSocketManager();
