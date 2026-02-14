// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Plus, Search, Trash2, X, BarChart3 } from "lucide-react";
import {
  getMemories,
  searchMemories,
  getMemoryStats,
  createMemory,
  deleteMemory,
  type Memory,
} from "../services/api.js";

const CATEGORY_COLORS: Record<string, string> = {
  fact: "text-blue-400 bg-blue-400/10",
  preference: "text-purple-400 bg-purple-400/10",
  event: "text-amber-400 bg-amber-400/10",
  skill: "text-green-400 bg-green-400/10",
  relationship: "text-pink-400 bg-pink-400/10",
  context: "text-gray-400 bg-gray-400/10",
};

export function MemoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [newMemory, setNewMemory] = useState({
    content: "",
    category: "fact",
    importance: 0.5,
  });

  const { data: memories, isLoading } = useQuery({
    queryKey: ["memories", filter],
    queryFn: () => getMemories(filter || undefined),
    enabled: !search,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["memory-search", search],
    queryFn: () => searchMemories(search),
    enabled: search.length > 2,
  });

  const { data: stats } = useQuery({
    queryKey: ["memory-stats"],
    queryFn: getMemoryStats,
  });

  const addMutation = useMutation({
    mutationFn: () => createMemory(newMemory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-stats"] });
      setShowAdd(false);
      setNewMemory({ content: "", category: "fact", importance: 0.5 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-stats"] });
    },
  });

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newMemory.content.trim()) addMutation.mutate();
    },
    [newMemory, addMutation],
  );

  const displayItems: Memory[] = search && searchResults
    ? searchResults.map((r) => r.memory)
    : memories || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">Memory</h1>
          {stats && (
            <span className="text-xs text-[var(--color-text-dim)]">
              {stats.total} memories
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <Plus size={14} />
          Add Memory
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
          <BarChart3 size={14} className="text-[var(--color-text-dim)]" />
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <span
              key={cat}
              className={`rounded px-1.5 py-0.5 text-[10px] capitalize ${CATEGORY_COLORS[cat] || "text-gray-400 bg-gray-400/10"}`}
            >
              {cat}: {count as number}
            </span>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <textarea
            value={newMemory.content}
            onChange={(e) =>
              setNewMemory({ ...newMemory, content: e.target.value })
            }
            placeholder="What should I remember?"
            rows={2}
            className="mb-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            required
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={newMemory.category}
              onChange={(e) =>
                setNewMemory({ ...newMemory, category: e.target.value })
              }
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none"
            >
              <option value="fact">Fact</option>
              <option value="preference">Preference</option>
              <option value="event">Event</option>
              <option value="skill">Skill</option>
              <option value="relationship">Relationship</option>
              <option value="context">Context</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
              Importance:
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={newMemory.importance}
                onChange={(e) =>
                  setNewMemory({
                    ...newMemory,
                    importance: parseFloat(e.target.value),
                  })
                }
                className="w-20"
              />
              <span>{newMemory.importance.toFixed(1)}</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-text-dim)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search + filter */}
      <div className="flex gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Semantic search..."
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
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none"
        >
          <option value="">All categories</option>
          <option value="fact">Facts</option>
          <option value="preference">Preferences</option>
          <option value="event">Events</option>
          <option value="skill">Skills</option>
          <option value="relationship">Relationships</option>
          <option value="context">Context</option>
        </select>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Loading...
          </div>
        )}

        {displayItems.map((memory: Memory) => (
          <div
            key={memory.id}
            className="group flex items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <div className="flex-1">
              <p className="text-sm">{memory.content}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] capitalize ${CATEGORY_COLORS[memory.category] || "text-gray-400 bg-gray-400/10"}`}
                >
                  {memory.category}
                </span>
                <span className="text-[10px] text-[var(--color-text-dim)]">
                  {memory.source}
                </span>
                <span className="text-[10px] text-[var(--color-text-dim)]">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => deleteMutation.mutate(memory.id)}
              className="rounded-lg p-1.5 text-[var(--color-text-dim)] opacity-0 transition-opacity hover:text-[var(--color-red)] group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {displayItems.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 p-8 text-[var(--color-text-dim)]">
            <Brain size={48} strokeWidth={1} />
            <p className="text-sm">
              {search
                ? "No memories match your search"
                : "No memories yet. Chat with FutureBuddy to build memory."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
