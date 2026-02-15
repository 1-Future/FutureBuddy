// SSE client for streaming chat responses from POST /api/chat/stream
// Uses XMLHttpRequest because React Native's fetch doesn't support ReadableStream

import { useConnectionStore } from '../stores/connection.store';
import type { ChatStreamEvent } from '../types/api';
import type { Action } from '../types/models';

interface SSECallbacks {
  onDelta: (text: string) => void;
  onDone: (conversationId: string, actions?: Action[]) => void;
  onError: (error: string) => void;
}

export function streamChat(
  message: string,
  conversationId: string | null,
  callbacks: SSECallbacks,
): { abort: () => void } {
  const baseUrl = useConnectionStore.getState().serverUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/api/chat/stream`;

  const body = JSON.stringify({
    message,
    conversationId: conversationId ?? undefined,
  });

  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');

  xhr.onprogress = () => {
    const text = xhr.responseText;
    if (!text || text.length <= lastIndex) return;

    const newData = text.slice(lastIndex);
    lastIndex = text.length;

    const lines = newData.split('\n');
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
  };

  xhr.onerror = () => {
    callbacks.onError('SSE connection failed');
  };

  xhr.ontimeout = () => {
    callbacks.onError('SSE request timed out');
  };

  xhr.onloadend = () => {
    // If we get here without a done event, check for errors
    if (xhr.status !== 200 && xhr.status !== 0) {
      callbacks.onError(`${xhr.status}: ${xhr.statusText}`);
    }
  };

  xhr.timeout = 120000; // 2 minute timeout for long AI responses
  xhr.send(body);

  return {
    abort: () => xhr.abort(),
  };
}
