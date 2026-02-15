// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Search, Trash2, ChevronDown } from "lucide-react";
import {
  getIdeas,
  getIdeasSummaryApi,
  updateIdeaApi,
  deleteIdeaApi,
  type IdeaItem,
  type IdeaSummary,
} from "../services/api.js";

const STATUS_LABELS: Record<string, string> = {
  spark: "Spark",
  planning: "Planning",
  building: "Building",
  shipped: "Shipped",
  shelved: "Shelved",
};

const STATUS_COLORS: Record<string, string> = {
  spark: "bg-[var(--color-yellow)]/15 text-[var(--color-yellow)]",
  planning: "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
  building: "bg-purple-500/15 text-purple-400",
  shipped: "bg-[var(--color-green)]/15 text-[var(--color-green)]",
  shelved: "bg-[var(--color-text-dim)]/15 text-[var(--color-text-dim)]",
};

const ALL_STATUSES = ["spark", "planning", "building", "shipped", "shelved"];

export function IdeasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: ideas, isLoading } = useQuery({
    queryKey: ["ideas", search, filterStatus],
    queryFn: () => getIdeas({ query: search || undefined, status: filterStatus }),
  });

  const { data: summary } = useQuery<IdeaSummary>({
    queryKey: ["ideas-summary"],
    queryFn: getIdeasSummaryApi,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; text?: string; notes?: string } }) =>
      updateIdeaApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      queryClient.invalidateQueries({ queryKey: ["ideas-summary"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIdeaApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      queryClient.invalidateQueries({ queryKey: ["ideas-summary"] });
      setExpandedId(null);
    },
  });

  const handleStatusChange = useCallback(
    (id: string, status: string) => {
      updateMutation.mutate({ id, data: { status } });
    },
    [updateMutation],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-[var(--color-yellow)]" />
            <h1 className="text-sm font-semibold">Ideas</h1>
            {summary && (
              <span className="text-xs text-[var(--color-text-dim)]">
                {summary.total} total
              </span>
            )}
          </div>
        </div>

        {/* Summary stats */}
        {summary && summary.total > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_STATUSES.map((status) => {
              const count = summary.byStatus[status] || 0;
              if (count === 0) return null;
              return (
                <span
                  key={status}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[status]}`}
                >
                  {STATUS_LABELS[status]} ({count})
                </span>
              );
            })}
          </div>
        )}

        {/* Search + filter */}
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-3 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterStatus(undefined)}
              className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                !filterStatus
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              All
            </button>
            {ALL_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(filterStatus === status ? undefined : status)}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                  filterStatus === status
                    ? STATUS_COLORS[status]
                    : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ideas list */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <p className="text-center text-xs text-[var(--color-text-dim)]">Loading...</p>
        )}

        {!isLoading && (!ideas || ideas.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-text-dim)]">
            <Lightbulb size={48} strokeWidth={1} />
            <p className="text-sm">No ideas yet</p>
            <p className="text-xs">Select text in Chat and click Idea to save one</p>
          </div>
        )}

        <div className="space-y-2">
          {ideas?.map((idea: IdeaItem) => (
            <div
              key={idea.id}
              className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-accent)]/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                >
                  <p className="text-sm text-[var(--color-text)]">{idea.text}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-dim)]">
                    &ldquo;{idea.selectedText.length > 100 ? idea.selectedText.slice(0, 100) + "..." : idea.selectedText}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status dropdown */}
                  <div className="relative">
                    <select
                      value={idea.status}
                      onChange={(e) => handleStatusChange(idea.id, e.target.value)}
                      className={`appearance-none rounded-full py-0.5 pl-2 pr-6 text-[10px] font-medium ${STATUS_COLORS[idea.status]} cursor-pointer border-none outline-none`}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(idea.id)}
                    className="text-[var(--color-text-dim)] opacity-0 transition-opacity hover:text-[var(--color-red)] group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {idea.tags && idea.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {idea.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-[10px] text-[var(--color-text-dim)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded details */}
              {expandedId === idea.id && (
                <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                  {idea.notes && (
                    <p className="mb-2 text-xs text-[var(--color-text-dim)]">{idea.notes}</p>
                  )}
                  <p className="text-[10px] text-[var(--color-text-dim)]">
                    Created {new Date(idea.createdAt).toLocaleDateString()} &middot; Updated{" "}
                    {new Date(idea.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
