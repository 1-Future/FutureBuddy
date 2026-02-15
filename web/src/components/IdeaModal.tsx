// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { createIdeaApi } from "../services/api.js";

interface IdeaModalProps {
  selectedText?: string;
  conversationId?: string;
  onClose: () => void;
}

export function IdeaModal({ selectedText, conversationId, onClose }: IdeaModalProps) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on escape
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
      await createIdeaApi({
        text: text.trim(),
        selectedText: selectedText || "",
        sourceConversationId: conversationId,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setSaved(true);
      setTimeout(onClose, 800);
    } catch (err: any) {
      setError(err.message || "Failed to save idea");
      setSaving(false);
    }
  }, [text, tags, selectedText, conversationId, saving, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Save Idea</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected text preview */}
        {selectedText && (
          <div className="mb-3 rounded-lg bg-[var(--color-bg)] px-3 py-2">
            <p className="text-xs text-[var(--color-text-dim)]">Selected text:</p>
            <p className="mt-0.5 text-xs text-[var(--color-text)]">
              &ldquo;{selectedText.length > 120 ? selectedText.slice(0, 120) + "..." : selectedText}&rdquo;
            </p>
          </div>
        )}

        {/* Idea text */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's your idea?"
          rows={3}
          className="mb-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
        />

        {/* Tags */}
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma-separated, optional)"
          className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)]"
        />

        {error && <p className="mb-3 text-xs text-[var(--color-red)]">{error}</p>}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!text.trim() || saving || saved}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
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
            "Save Idea"
          )}
        </button>
      </div>
    </>
  );
}
