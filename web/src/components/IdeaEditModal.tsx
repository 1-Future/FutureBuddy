// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { updateIdeaApi, type IdeaItem } from "../services/api.js";

const ALL_STATUSES = ["spark", "planning", "building", "shipped", "shelved"] as const;

const STATUS_LABELS: Record<string, string> = {
  spark: "Spark",
  planning: "Planning",
  building: "Building",
  shipped: "Shipped",
  shelved: "Shelved",
};

const STATUS_COLORS: Record<string, string> = {
  spark: "bg-[var(--color-yellow)]/15 text-[var(--color-yellow)] border-[var(--color-yellow)]/30",
  planning: "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/30",
  building: "bg-purple-500/15 text-purple-400 border-purple-400/30",
  shipped: "bg-[var(--color-green)]/15 text-[var(--color-green)] border-[var(--color-green)]/30",
  shelved: "bg-[var(--color-text-dim)]/15 text-[var(--color-text-dim)] border-[var(--color-text-dim)]/30",
};

interface IdeaEditModalProps {
  idea: IdeaItem;
  onClose: () => void;
  onSaved: () => void;
}

export function IdeaEditModal({ idea, onClose, onSaved }: IdeaEditModalProps) {
  const [text, setText] = useState(idea.text);
  const [tags, setTags] = useState((idea.tags || []).join(", "));
  const [notes, setNotes] = useState(idea.notes || "");
  const [status, setStatus] = useState(idea.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError("");

    try {
      await updateIdeaApi(idea.id, {
        text: text.trim(),
        status,
        notes: notes.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setSaved(true);
      onSaved();
      setTimeout(onClose, 500);
    } catch (err: any) {
      setError(err.message || "Failed to update idea");
      setSaving(false);
    }
  }, [text, tags, notes, status, idea.id, saving, onClose, onSaved]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Edit Idea</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Idea text */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's your idea?"
          rows={3}
          className="mb-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
        />

        {/* Notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional — longer-form planning)"
          rows={3}
          className="mb-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
        />

        {/* Tags */}
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma-separated, optional)"
          className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
        />

        {/* Status selector */}
        <div className="mb-4">
          <p className="mb-2 text-xs text-[var(--color-text-dim)]">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full border px-3 py-1 text-[10px] font-medium transition-colors ${
                  status === s
                    ? STATUS_COLORS[s]
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-3 text-xs text-[var(--color-red)]">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving || saved}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              saved
                ? "bg-[var(--color-green)]"
                : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"
            } disabled:opacity-60`}
          >
            {saved ? (
              <>
                <Check size={16} />
                Saved!
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
