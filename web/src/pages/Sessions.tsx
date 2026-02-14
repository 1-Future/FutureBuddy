// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollText, Search, Clock, MessageSquare, RefreshCw, X, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import {
  getSessions,
  searchSessions,
  getSession,
  reindexSessions,
  type SessionSummary,
  type SessionDetail,
  type SessionEntry,
} from "../services/api.js";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function EntryBubble({ entry }: { entry: SessionEntry }) {
  const baseClasses = "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words";

  if (entry.type === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={`${baseClasses} max-w-[85%] bg-blue-500/15 text-blue-300 border border-blue-500/20`}
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-blue-400/70">
            User
          </div>
          {entry.content}
        </div>
      </div>
    );
  }

  if (entry.type === "assistant") {
    return (
      <div className="flex justify-start">
        <div
          className={`${baseClasses} max-w-[85%] bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)]`}
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-dim)]">
            Assistant
          </div>
          {entry.content}
        </div>
      </div>
    );
  }

  if (entry.type === "tool_use") {
    return (
      <div className="flex justify-start pl-4">
        <div
          className={`${baseClasses} max-w-[80%] bg-green-500/10 text-green-300 border border-green-500/20 text-xs`}
        >
          <Wrench size={10} className="mr-1 inline-block text-green-400/70" />
          {entry.content}
        </div>
      </div>
    );
  }

  // tool_result
  return (
    <div className="flex justify-start pl-4">
      <div
        className={`${baseClasses} max-w-[80%] bg-green-500/5 text-green-200/70 border border-green-500/10 text-xs font-mono`}
      >
        {entry.content}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  isExpanded,
  onToggle,
}: {
  session: SessionSummary;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["session-detail", session.id],
    queryFn: () => getSession(session.id),
    enabled: isExpanded,
  });

  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <div className="mt-0.5 text-[var(--color-text-dim)]">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--color-text)] line-clamp-2">{session.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-dim)]">
              <Clock size={10} />
              {formatDate(session.startedAt)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-dim)]">
              <MessageSquare size={10} />
              {session.messageCount} messages
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-[var(--color-bg)] px-4 pb-4">
          {isLoading && (
            <div className="py-4 text-center text-xs text-[var(--color-text-dim)]">
              Loading session...
            </div>
          )}
          {detail && (
            <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 max-h-[500px] overflow-y-auto">
              {(detail as SessionDetail).entries.map((entry: SessionEntry, i: number) => (
                <EntryBubble key={i} entry={entry} />
              ))}
              {(detail as SessionDetail).entries.length === 0 && (
                <p className="py-4 text-center text-xs text-[var(--color-text-dim)]">
                  No entries in this session.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => getSessions(),
    enabled: !search,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["sessions-search", search],
    queryFn: () => searchSessions(search),
    enabled: search.length > 2,
  });

  const reindexMutation = useMutation({
    mutationFn: reindexSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const handleToggle = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [],
  );

  const displayItems: SessionSummary[] =
    search && search.length > 2 && searchResults ? searchResults : sessions || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">Sessions</h1>
          {sessions && (
            <span className="text-xs text-[var(--color-text-dim)]">
              {sessions.length} indexed
            </span>
          )}
        </div>
        <button
          onClick={() => reindexMutation.mutate()}
          disabled={reindexMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          <RefreshCw size={14} className={reindexMutation.isPending ? "animate-spin" : ""} />
          {reindexMutation.isPending ? "Indexing..." : "Reindex"}
        </button>
      </div>

      {/* Reindex result */}
      {reindexMutation.isSuccess && (
        <div className="border-b border-[var(--color-border)] bg-green-500/10 px-4 py-2 text-xs text-green-300">
          Indexed {reindexMutation.data.indexed} sessions from {reindexMutation.data.directory}
        </div>
      )}

      {/* Search */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-8 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !search && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">Loading...</div>
        )}

        {displayItems.map((session: SessionSummary) => (
          <SessionCard
            key={session.id}
            session={session}
            isExpanded={expandedId === session.id}
            onToggle={() => handleToggle(session.id)}
          />
        ))}

        {displayItems.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 p-8 text-[var(--color-text-dim)]">
            <ScrollText size={48} strokeWidth={1} />
            <p className="text-sm">
              {search
                ? "No sessions match your search"
                : "No sessions indexed yet. Click Reindex to scan your Claude session files."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
