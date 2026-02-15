// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Send, Plus, MessageSquare, Columns } from "lucide-react";
import {
  streamMessage,
  getConversations,
  getConversation,
  translateText,
  type ChatMessage,
  type Conversation,
} from "../services/api.js";
import { useTextSelection } from "../hooks/useTextSelection.js";
import { SelectionMenu } from "../components/SelectionMenu.js";
import { DefineTooltip } from "../components/DefineTooltip.js";
import { ExplainPanel } from "../components/ExplainPanel.js";
import { ResearchPanel } from "../components/ResearchPanel.js";
import { IdeaModal } from "../components/IdeaModal.js";

type ActiveOverlay =
  | null
  | { type: "define"; text: string; rect: DOMRect }
  | { type: "explain"; text: string }
  | { type: "research"; text: string }
  | { type: "idea"; text: string };

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [streamingContent, setStreamingContent] = useState("");
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [buddyView, setBuddyView] = useState(false);
  const [translations, setTranslations] = useState<Map<number, string>>(new Map());
  const messagesEnd = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const { selectedText, selectionRect, clearSelection } = useTextSelection(messagesRef);

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
    setTranslations(new Map());
  }, []);

  // Auto-load conversation from ?id= query param (e.g. navigated from Ideas page)
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      loadConversation(idParam);
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setStreamingContent("");
    setInput("");
    setTranslations(new Map());
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
    },
    [],
  );

  // Translate an assistant message for buddy view
  const translateMessage = useCallback((msgIndex: number, content: string) => {
    let accumulated = "";
    translateText(
      content,
      (delta) => {
        accumulated += delta;
        setTranslations((prev) => new Map(prev).set(msgIndex, accumulated));
      },
      () => {
        // done
      },
    ).catch(() => {
      setTranslations((prev) => new Map(prev).set(msgIndex, "(Translation failed)"));
    });
  }, []);

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
          const newMsgIndex = messages.length + 1; // +1 because user msg was already appended
          setMessages((prev) => {
            const updated = [
              ...prev,
              {
                role: "assistant" as const,
                content: accumulated,
                timestamp: new Date().toISOString(),
              },
            ];
            return updated;
          });
          setStreamingContent("");
          refetchConversations();

          // Auto-translate for buddy view
          if (buddyView && accumulated) {
            translateMessage(newMsgIndex, accumulated);
          }
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
  }, [input, loading, conversationId, refetchConversations, messages.length, buddyView, translateMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  // Selection menu handlers
  const handleDefine = useCallback(() => {
    if (selectedText && selectionRect) {
      setActiveOverlay({ type: "define", text: selectedText, rect: selectionRect });
      clearSelection();
    }
  }, [selectedText, selectionRect, clearSelection]);

  const handleExplain = useCallback(() => {
    if (selectedText) {
      setActiveOverlay({ type: "explain", text: selectedText });
      clearSelection();
    }
  }, [selectedText, clearSelection]);

  const handleResearch = useCallback(() => {
    if (selectedText) {
      setActiveOverlay({ type: "research", text: selectedText });
      clearSelection();
    }
  }, [selectedText, clearSelection]);

  const handleIdea = useCallback(() => {
    if (selectedText) {
      setActiveOverlay({ type: "idea", text: selectedText });
      clearSelection();
    }
  }, [selectedText, clearSelection]);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

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
        {/* Buddy view toggle */}
        <div className="flex items-center justify-end border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5">
          <button
            onClick={() => setBuddyView(!buddyView)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
              buddyView
                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            }`}
            title="Toggle Buddy View — plain English translations"
          >
            <Columns size={14} />
            Buddy View
          </button>
        </div>

        {/* Messages area */}
        <div ref={messagesRef} className="flex flex-1 overflow-hidden">
          {/* Left column: Technical messages */}
          <div className={`flex flex-1 flex-col gap-3 overflow-y-auto p-4 ${buddyView ? "border-r border-[var(--color-border)]" : ""}`}>
            {buddyView && (
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-dim)]">
                Technical
              </div>
            )}

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

          {/* Right column: Plain English (buddy view) */}
          {buddyView && (
            <div className="flex w-1/2 flex-col gap-3 overflow-y-auto bg-[var(--color-surface)] p-4">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-dim)]">
                Plain English
              </div>

              {messages.map((msg, i) => {
                if (msg.role !== "assistant") return null;
                const translation = translations.get(i);
                return (
                  <div
                    key={i}
                    className="self-start whitespace-pre-wrap break-words rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm leading-relaxed"
                  >
                    {translation || (
                      <button
                        onClick={() => translateMessage(i, msg.content)}
                        className="text-xs text-[var(--color-accent)] hover:underline"
                      >
                        Translate to plain English
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Selection menu */}
      {selectedText && selectionRect && !activeOverlay && (
        <SelectionMenu
          selectionRect={selectionRect}
          onDefine={handleDefine}
          onExplain={handleExplain}
          onResearch={conversationId ? handleResearch : undefined}
          onIdea={conversationId ? handleIdea : undefined}
          onDismiss={clearSelection}
        />
      )}

      {/* Overlays */}
      {activeOverlay?.type === "define" && (
        <DefineTooltip
          text={activeOverlay.text}
          selectionRect={activeOverlay.rect}
          onClose={closeOverlay}
        />
      )}
      {activeOverlay?.type === "explain" && (
        <ExplainPanel text={activeOverlay.text} onClose={closeOverlay} />
      )}
      {activeOverlay?.type === "research" && conversationId && (
        <ResearchPanel
          text={activeOverlay.text}
          parentConversationId={conversationId}
          onClose={closeOverlay}
        />
      )}
      {activeOverlay?.type === "idea" && (
        <IdeaModal
          selectedText={activeOverlay.text}
          conversationId={conversationId}
          onClose={closeOverlay}
        />
      )}
    </div>
  );
}
