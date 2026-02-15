// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send } from "lucide-react";
import { createResearchThread, streamMessage, type ChatMessage } from "../services/api.js";

interface ResearchPanelProps {
  text: string;
  parentConversationId?: string;
  onClose: () => void;
}

export function ResearchPanel({ text, parentConversationId, onClose }: ResearchPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create the research thread on mount
  useEffect(() => {
    let cancelled = false;

    createResearchThread(text, parentConversationId)
      .then((result) => {
        if (!cancelled) {
          setConversationId(result.conversationId);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to create research thread");
      });

    return () => {
      cancelled = true;
    };
  }, [text, parentConversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, streamingContent]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading || !conversationId) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      let accumulated = "";
      await streamMessage(
        msg,
        conversationId,
        (delta) => {
          accumulated += delta;
          setStreamingContent(accumulated);
        },
        () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: accumulated,
              timestamp: new Date().toISOString(),
            },
          ]);
          setStreamingContent("");
        },
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Failed to get response.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setStreamingContent("");
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId]);

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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-[var(--color-accent)]">Research</span>
            <p className="mt-0.5 truncate text-sm text-[var(--color-text)]">
              &ldquo;{text.length > 80 ? text.slice(0, 80) + "..." : text}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 rounded-lg p-1.5 text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="px-4 py-2 text-xs text-[var(--color-red)]">{error}</p>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {!conversationId && !error && (
            <p className="text-center text-xs text-[var(--color-text-dim)]">
              Setting up research thread...
            </p>
          )}

          {conversationId && messages.length === 0 && !streamingContent && (
            <p className="text-center text-xs text-[var(--color-text-dim)]">
              Ask questions to research &ldquo;{text.slice(0, 40)}&rdquo;
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "self-end rounded-br-sm bg-[var(--color-user-bubble)]"
                  : msg.role === "system"
                    ? "self-center text-center italic text-[var(--color-text-dim)]"
                    : "self-start rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {streamingContent && (
            <div className="max-w-[90%] self-start whitespace-pre-wrap break-words rounded-xl rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs leading-relaxed">
              {streamingContent}
              <span className="inline-block h-3 w-0.5 animate-pulse bg-[var(--color-accent)]" />
            </div>
          )}

          {loading && !streamingContent && (
            <p className="self-start text-xs text-[var(--color-text-dim)]">Thinking...</p>
          )}
        </div>

        {/* Input */}
        {conversationId && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this topic..."
                disabled={loading}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="rounded-lg bg-[var(--color-accent)] p-2 text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
