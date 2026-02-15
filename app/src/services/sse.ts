// SSE client for streaming chat responses from POST /api/chat/stream

import { useConnectionStore } from '../stores/connection.store';
import type { ChatStreamEvent } from '../types/api';
import type { Action } from '../types/models';

interface SSECallbacks {
  onDelta: (text: string) => void;
  onDone: (conversationId: string, actions?: Action[]) => void;
  onError: (error: string) => void;
}

export async function streamChat(
  message: string,
  conversationId: string | null,
  callbacks: SSECallbacks,
): Promise<void> {
  const baseUrl = useConnectionStore.getState().serverUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/api/chat/stream`;

  const body = JSON.stringify({
    message,
    conversationId: conversationId ?? undefined,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      callbacks.onError(`${response.status}: ${text}`);
      return;
    }

    if (!response.body) {
      callbacks.onError('No response body');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event: ChatStreamEvent = JSON.parse(jsonStr);

          if ('error' in event) {
            callbacks.onError(event.error);
            return;
          }

          if ('delta' in event && !('done' in event)) {
            callbacks.onDelta(event.delta);
          }

          if ('done' in event && event.done) {
            callbacks.onDone(event.conversationId, event.actions);
            return;
          }
        } catch {
          // Skip malformed SSE data
        }
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'SSE connection failed');
  }
}
