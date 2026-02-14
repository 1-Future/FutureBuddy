// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Search,
  ExternalLink,
  Trash2,
  Plus,
  Link,
  X,
  BarChart3,
} from "lucide-react";
import {
  getBookmarks,
  getBookmarkStats,
  addBookmark,
  extractBookmarks,
  deleteBookmark,
  type BookmarkItem,
} from "../services/api.js";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "docs", label: "Docs" },
  { key: "tools", label: "Tools" },
  { key: "learning", label: "Learning" },
  { key: "code", label: "Code" },
  { key: "reference", label: "Reference" },
  { key: "social", label: "Social" },
  { key: "news", label: "News" },
  { key: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  docs: "text-blue-400 bg-blue-400/10",
  tools: "text-emerald-400 bg-emerald-400/10",
  learning: "text-amber-400 bg-amber-400/10",
  code: "text-purple-400 bg-purple-400/10",
  reference: "text-cyan-400 bg-cyan-400/10",
  social: "text-pink-400 bg-pink-400/10",
  news: "text-orange-400 bg-orange-400/10",
  other: "text-gray-400 bg-gray-400/10",
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

export function BookmarksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [extractText, setExtractText] = useState("");

  const { data: bookmarksData, isLoading } = useQuery({
    queryKey: ["bookmarks", category, search],
    queryFn: () =>
      getBookmarks({
        category: category || undefined,
        query: search || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ["bookmark-stats"],
    queryFn: getBookmarkStats,
  });

  const addMutation = useMutation({
    mutationFn: () => addBookmark({ url: newUrl, title: newTitle || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmark-stats"] });
      setShowAdd(false);
      setNewUrl("");
      setNewTitle("");
    },
  });

  const extractMutation = useMutation({
    mutationFn: () => extractBookmarks(extractText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmark-stats"] });
      setShowExtract(false);
      setExtractText("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmark-stats"] });
    },
  });

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newUrl.trim()) addMutation.mutate();
    },
    [newUrl, addMutation],
  );

  const handleExtract = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (extractText.trim()) extractMutation.mutate();
    },
    [extractText, extractMutation],
  );

  const bookmarks: BookmarkItem[] = bookmarksData?.bookmarks || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bookmark size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">Bookmarks</h1>
          {stats && (
            <span className="text-xs text-[var(--color-text-dim)]">
              {stats.total} saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowExtract(!showExtract);
              setShowAdd(false);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
          >
            <Link size={14} />
            Extract
          </button>
          <button
            onClick={() => {
              setShowAdd(!showAdd);
              setShowExtract(false);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
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
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            className="mb-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            required
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              {addMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-text-dim)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Extract form */}
      {showExtract && (
        <form
          onSubmit={handleExtract}
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <textarea
            value={extractText}
            onChange={(e) => setExtractText(e.target.value)}
            placeholder="Paste text containing URLs to extract..."
            rows={4}
            className="mb-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={extractMutation.isPending}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              {extractMutation.isPending ? "Extracting..." : "Extract URLs"}
            </button>
            <button
              type="button"
              onClick={() => setShowExtract(false)}
              className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-text-dim)]"
            >
              Cancel
            </button>
            {extractMutation.isSuccess && (
              <span className="self-center text-xs text-[var(--color-green)]">
                Done! URLs extracted.
              </span>
            )}
          </div>
        </form>
      )}

      {/* Search + category filter */}
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
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
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                category === cat.key
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-hover)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmark list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Loading...
          </div>
        )}

        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="group flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            {/* Favicon */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(bm.url)}&sz=16`}
              alt=""
              width={16}
              height={16}
              className="shrink-0"
            />

            {/* Info */}
            <a
              href={bm.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {bm.title || getDomain(bm.url)}
                  </span>
                  <ExternalLink
                    size={12}
                    className="shrink-0 text-[var(--color-text-dim)] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
                <div className="truncate text-xs text-[var(--color-text-dim)]">
                  {getDomain(bm.url)}
                  {bm.title ? "" : " — " + bm.url}
                </div>
              </div>
            </a>

            {/* Category badge */}
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] capitalize ${CATEGORY_COLORS[bm.category] || "text-gray-400 bg-gray-400/10"}`}
            >
              {bm.category}
            </span>

            {/* Visit count */}
            {bm.visit_count > 1 && (
              <span className="shrink-0 text-[10px] text-[var(--color-text-dim)]">
                {bm.visit_count}x
              </span>
            )}

            {/* Date */}
            <span className="shrink-0 text-[10px] text-[var(--color-text-dim)]">
              {formatDate(bm.created_at)}
            </span>

            {/* Delete */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMutation.mutate(bm.id);
              }}
              className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-dim)] opacity-0 transition-opacity hover:text-[var(--color-red)] group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {bookmarks.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 p-8 text-[var(--color-text-dim)]">
            <Bookmark size={48} strokeWidth={1} />
            <p className="text-sm">
              {search || category
                ? "No bookmarks match your filter"
                : "No bookmarks yet. Add one or extract URLs from text."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
