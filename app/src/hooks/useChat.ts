import { useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chat.store';
import { streamChat } from '../services/sse';
import { getConversation } from '../services/api';
import type { ChatMessage, Action } from '../types/models';

export function useChat() {
  const {
    conversationId,
    messages,
    streamingContent,
    isStreaming,
    toolActivities,
    setConversationId,
    setMessages,
    addMessage,
    appendToken,
    finishStream,
    setStreaming,
    clearStream,
  } = useChatStore();

  const abortRef = useRef<{ abort: () => void } | null>(null);

  const sendMessage = useCallback(
    (text: string, images?: string[]) => {
      // Add optimistic user message
      const userMsg: ChatMessage = {
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        images,
      };
      addMessage(userMsg);
      setStreaming(true);

      // Stream via SSE (XHR-based)
      const handle = streamChat(text, conversationId, {
        onDelta: (delta) => {
          appendToken(delta);
        },
        onDone: (newConversationId, actions?: Action[]) => {
          abortRef.current = null;
          setConversationId(newConversationId);
          const content = useChatStore.getState().streamingContent;
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
          };
          finishStream(assistantMsg, actions);
        },
        onError: (error) => {
          abortRef.current = null;
          console.error('[SSE] Error:', error);
          clearStream();
        },
      });
      abortRef.current = handle;
    },
    [conversationId, addMessage, setStreaming, appendToken, setConversationId, finishStream, clearStream],
  );

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearStream();
  }, [clearStream]);

  const loadConversation = useCallback(
    async (id: string) => {
      setConversationId(id);
      clearStream();
      try {
        const res = await getConversation(id);
        setMessages(res.messages);
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    },
    [setConversationId, setMessages, clearStream],
  );

  return {
    conversationId,
    messages,
    streamingContent,
    isStreaming,
    toolActivities,
    sendMessage,
    cancelStream,
    loadConversation,
  };
}
