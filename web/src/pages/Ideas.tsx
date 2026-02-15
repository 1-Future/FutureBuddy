// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Lightbulb,
  Search,
  Trash2,
  Pencil,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Zap,
  PenLine,
  Hammer,
  Rocket,
  Archive,
  Plus,
  Search as SearchIcon,
} from "lucide-react";
import {
  getIdeas,
  getIdeasSummaryApi,
  updateIdeaApi,
  deleteIdeaApi,
  type IdeaItem,
  type IdeaSummary,
} from "../services/api.js";
import { IdeaModal } from "../components/IdeaModal.js";
import { IdeaEditModal } from "../components/IdeaEditModal.js";
import { ResearchPanel } from "../components/ResearchPanel.js";

// ── Constants ──────────────────────────────────────────────────────────

const ALL_STATUSES = ["spark", "planning", "building", "shipped", "shelved"] as const;

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Zap; color: string; borderColor: string; emptyHint: string }
> = {
  spark: {
    label: "Spark",
    icon: Zap,
    color: "text-[var(--color-yellow)]",
    borderColor: "border-l-[var(--color-yellow)]",
    emptyHint: "Capture a spark...",
  },
  planning: {
    label: "Planning",
    icon: PenLine,
    color: "text-[var(--color-accent)]",
    borderColor: "border-l-[var(--color-accent)]",
    emptyHint: "Plan your next move",
  },
  building: {
    label: "Building",
    icon: Hammer,
    color: "text-purple-400",
    borderColor: "border-l-purple-400",
    emptyHint: "Build something great",
  },
  shipped: {
    label: "Shipped",
    icon: Rocket,
    color: "text-[var(--color-green)]",
    borderColor: "border-l-[var(--color-green)]",
    emptyHint: "Ship it!",
  },
  shelved: {
    label: "Shelved",
    icon: Archive,
    color: "text-[var(--color-text-dim)]",
    borderColor: "border-l-[var(--color-text-dim)]",
    emptyHint: "Parked for later",
  },
};

const STATUS_BG: Record<string, string> = {
  spark: "bg-[var(--color-yellow)]/10",
  planning: "bg-[var(--color-accent)]/10",
  building: "bg-purple-500/10",
  shipped: "bg-[var(--color-green)]/10",
  shelved: "bg-[var(--color-text-dim)]/10",
};

// ── Relative time ────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return `${diffMon}mo ago`;
  return `${Math.floor(diffMon / 12)}y ago`;
}

// ── Component ────────────────────────────────────────────────────────

export function IdeasPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeaItem | null>(null);
  const [exploringIdea, setExploringIdea] = useState<IdeaItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: ideas, isLoading } = useQuery({
    queryKey: ["ideas"],
    queryFn: () => getIdeas(),
  });

  const { data: summary } = useQuery<IdeaSummary>({
    queryKey: ["ideas-summary"],
    queryFn: getIdeasSummaryApi,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ideas"] });
    queryClient.invalidateQueries({ queryKey: ["ideas-summary"] });
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string } }) =>
      updateIdeaApi(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIdeaApi,
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
    },
  });

  // Filter ideas by search across all fields
  const filteredIdeas = useMemo(() => {
    if (!ideas) return [];
    if (!search.trim()) return ideas;
    const q = search.toLowerCase();
    return ideas.filter(
      (idea) =>
        idea.text.toLowerCase().includes(q) ||
        idea.selectedText?.toLowerCase().includes(q) ||
        idea.notes?.toLowerCase().includes(q) ||
        idea.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [ideas, search]);

  // Group by status
  const columns = useMemo(() => {
    const map: Record<string, IdeaItem[]> = {};
    for (const s of ALL_STATUSES) map[s] = [];
    for (const idea of filteredIdeas) {
      if (map[idea.status]) map[idea.status].push(idea);
    }
    return map;
  }, [filteredIdeas]);

  const moveIdea = useCallback(
    (idea: IdeaItem, direction: -1 | 1) => {
      const currentIdx = ALL_STATUSES.indexOf(idea.status as (typeof ALL_STATUSES)[number]);
      const nextIdx = currentIdx + direction;
      if (nextIdx < 0 || nextIdx >= ALL_STATUSES.length) return;
      updateMutation.mutate({ id: idea.id, data: { status: ALL_STATUSES[nextIdx] } });
    },
    [updateMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmDelete === id) {
        deleteMutation.mutate(id);
      } else {
        setConfirmDelete(id);
        setTimeout(() => setConfirmDelete(null), 3000);
      }
    },
    [confirmDelete, deleteMutation],
  );

  const handleSource = useCallback(
    (conversationId: string) => {
      navigate(`/chat?id=${conversationId}`);
    },
    [navigate],
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={14} />
            New Idea
          </button>
        </div>

        {/* Summary stats */}
        {summary && summary.total > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_STATUSES.map((status) => {
              const count = summary.byStatus[status] || 0;
              if (count === 0) return null;
              const cfg = STATUS_CONFIG[status];
              return (
                <span
                  key={status}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BG[status]} ${cfg.color}`}
                >
                  <cfg.icon size={10} />
                  {cfg.label} ({count})
                </span>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="mt-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-3 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {isLoading && (
          <p className="text-center text-xs text-[var(--color-text-dim)]">Loading...</p>
        )}

        {!isLoading && (!ideas || ideas.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-text-dim)]">
            <Lightbulb size={48} strokeWidth={1} />
            <p className="text-sm">No ideas yet</p>
            <p className="text-xs">Click &quot;+ New Idea&quot; or select text in Chat</p>
          </div>
        )}

        {!isLoading && ideas && ideas.length > 0 && (
          <div className="flex h-full gap-4">
            {ALL_STATUSES.map((status) => {
              const cfg = STATUS_CONFIG[status];
              const statusIdeas = columns[status] || [];
              const Icon = cfg.icon;

              return (
                <div
                  key={status}
                  className="flex min-w-[240px] max-w-[280px] flex-shrink-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]"
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
                    <Icon size={14} className={cfg.color} />
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      {cfg.label}
                    </span>
                    {statusIdeas.length > 0 && (
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BG[status]} ${cfg.color}`}
                      >
                        {statusIdeas.length}
                      </span>
                    )}
                  </div>

                  {/* Column body */}
                  <div className="flex-1 space-y-2 overflow-y-auto p-2">
                    {statusIdeas.length === 0 && (
                      <p className="px-2 py-6 text-center text-[10px] text-[var(--color-text-dim)]">
                        {cfg.emptyHint}
                      </p>
                    )}

                    {statusIdeas.map((idea) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        status={status}
                        confirmDelete={confirmDelete}
                        onMoveLeft={() => moveIdea(idea, -1)}
                        onMoveRight={() => moveIdea(idea, 1)}
                        onExplore={() => setExploringIdea(idea)}
                        onSource={idea.sourceConversationId ? () => handleSource(idea.sourceConversationId!) : undefined}
                        onEdit={() => setEditingIdea(idea)}
                        onDelete={() => handleDelete(idea.id)}
                        isFirst={status === ALL_STATUSES[0]}
                        isLast={status === ALL_STATUSES[ALL_STATUSES.length - 1]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <IdeaModal onClose={() => setShowCreateModal(false)} />
      )}

      {editingIdea && (
        <IdeaEditModal
          idea={editingIdea}
          onClose={() => setEditingIdea(null)}
          onSaved={invalidate}
        />
      )}

      {exploringIdea && (
        <ResearchPanel
          text={exploringIdea.text}
          parentConversationId={exploringIdea.sourceConversationId}
          onClose={() => setExploringIdea(null)}
        />
      )}
    </div>
  );
}

// ── Idea Card ────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: IdeaItem;
  status: string;
  confirmDelete: string | null;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onExplore: () => void;
  onSource?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function IdeaCard({
  idea,
  status,
  confirmDelete,
  onMoveLeft,
  onMoveRight,
  onExplore,
  onSource,
  onEdit,
  onDelete,
  isFirst,
  isLast,
}: IdeaCardProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className={`group relative rounded-lg border border-[var(--color-border)] border-l-4 ${cfg.borderColor} bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-text-dim)]/30`}
    >
      {/* Text */}
      <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-text)]">
        {idea.text}
      </p>

      {/* Selected text */}
      {idea.selectedText && (
        <p className="mt-1 line-clamp-1 text-[10px] text-[var(--color-text-dim)]">
          &ldquo;{idea.selectedText}&rdquo;
        </p>
      )}

      {/* Tags + time */}
      <div className="mt-2 flex items-center gap-1">
        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-1 flex-wrap gap-1">
            {idea.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--color-bg)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-dim)]"
              >
                {tag}
              </span>
            ))}
            {idea.tags.length > 3 && (
              <span className="text-[9px] text-[var(--color-text-dim)]">
                +{idea.tags.length - 3}
              </span>
            )}
          </div>
        )}
        <span className="ml-auto shrink-0 text-[9px] text-[var(--color-text-dim)]">
          {relativeTime(idea.updatedAt)}
        </span>
      </div>

      {/* Hover action bar */}
      <div className="mt-2 flex items-center gap-1 border-t border-[var(--color-border)] pt-2 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Move arrows */}
        <button
          onClick={onMoveLeft}
          disabled={isFirst}
          className="rounded p-1 text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:invisible"
          title="Move left"
        >
          <ChevronLeft size={12} />
        </button>
        <button
          onClick={onMoveRight}
          disabled={isLast}
          className="rounded p-1 text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:invisible"
          title="Move right"
        >
          <ChevronRight size={12} />
        </button>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={onExplore}
          className="rounded p-1 text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
          title="Explore"
        >
          <SearchIcon size={12} />
        </button>
        {onSource && (
          <button
            onClick={onSource}
            className="rounded p-1 text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
            title="Go to source conversation"
          >
            <ExternalLink size={12} />
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded p-1 text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
          title="Edit"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          className={`rounded p-1 transition-colors ${
            confirmDelete === idea.id
              ? "bg-[var(--color-red)]/15 text-[var(--color-red)]"
              : "text-[var(--color-text-dim)] hover:bg-[var(--color-red)]/10 hover:text-[var(--color-red)]"
          }`}
          title={confirmDelete === idea.id ? "Click again to confirm" : "Delete"}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
