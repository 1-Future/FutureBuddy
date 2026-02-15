import { useCallback } from 'react';
import { uid } from '../utils/uid';
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

      // Stream via SSE
      streamChat(text, conversationId, {
        onDelta: (delta) => {
          appendToken(delta);
        },
        onDone: (newConversationId, actions?: Action[]) => {
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
          console.error('[SSE] Error:', error);
          clearStream();
        },
      });
    },
    [conversationId, addMessage, setStreaming, appendToken, setConversationId, finishStream, clearStream],
  );

  const cancelStream = useCallback(() => {
    // SSE doesn't have a clean cancel mechanism; just clear state
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
