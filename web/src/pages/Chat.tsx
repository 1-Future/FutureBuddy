// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Plus, MessageSquare } from "lucide-react";
import {
  streamMessage,
  getConversations,
  getConversation,
  type ChatMessage,
  type Conversation,
} from "../services/api.js";

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const loadConversation = useCallback(async (id: string) => {
    const data = await getConversation(id);
    setConversationId(id);
    setMessages(data.messages);
    setStreamingContent("");
  }, []);

  const startNew = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setStreamingContent("");
    setInput("");
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
    },
    [],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      let accumulated = "";
      await streamMessage(
        text,
        conversationId,
        (delta) => {
          accumulated += delta;
          setStreamingContent(accumulated);
        },
        (data) => {
          setConversationId(data.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: accumulated,
              timestamp: new Date().toISOString(),
            },
          ]);
          setStreamingContent("");
          refetchConversations();
        },
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Failed to get a response. Is the server running?",
          timestamp: new Date().toISOString(),
        },
      ]);
      setStreamingContent("");
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, refetchConversations]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
          <span className="text-sm font-medium">Conversations</span>
          <button
            onClick={startNew}
            className="rounded-lg p-1.5 text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title="New conversation"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {conversations?.map((conv: Conversation) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                conv.id === conversationId
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <MessageSquare size={14} className="shrink-0" />
              <span className="truncate">
                {conv.title || "Untitled"}
              </span>
            </button>
          ))}
          {(!conversations || conversations.length === 0) && (
            <p className="px-3 py-4 text-center text-xs text-[var(--color-text-dim)]">
              No conversations yet
            </p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && !streamingContent && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[var(--color-text-dim)]">
              <MessageSquare size={48} strokeWidth={1} />
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                Hey there
              </h2>
              <p className="text-sm">
                I&apos;m FutureBuddy. Ask me anything — I remember everything.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "self-end rounded-br-sm bg-[var(--color-user-bubble)]"
                  : msg.role === "system"
                    ? "self-center text-center text-xs italic text-[var(--color-text-dim)]"
                    : "self-start rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {streamingContent && (
            <div className="max-w-[85%] self-start whitespace-pre-wrap break-words rounded-xl rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm leading-relaxed">
              {streamingContent}
              <span className="inline-block h-4 w-0.5 animate-pulse bg-[var(--color-accent)]" />
            </div>
          )}

          {loading && !streamingContent && (
            <div className="self-start text-sm text-[var(--color-text-dim)]">
              Thinking...
            </div>
          )}

          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
              style={{ minHeight: 44, maxHeight: 150 }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-[var(--color-accent)] p-2.5 text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
