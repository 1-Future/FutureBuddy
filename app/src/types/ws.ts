// WebSocket message types for the new FutureBuddy server protocol

export type WSMessageType =
  | 'terminal:data'
  | 'terminal:resize'
  | 'action:response';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  sessionId?: string;
  payload: T;
}

// Terminal payloads
export interface TerminalDataPayload {
  data: string;
}

export interface TerminalResizePayload {
  cols: number;
  rows: number;
}

// Action payloads
export interface ActionResponsePayload {
  actionId: string;
  approved: boolean;
}
