// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { defineText } from "../services/api.js";

interface DefineTooltipProps {
  text: string;
  selectionRect: DOMRect;
  onClose: () => void;
}

export function DefineTooltip({ text, selectionRect, onClose }: DefineTooltipProps) {
  const [definition, setDefinition] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Position below selection
  const gap = 8;
  let top = selectionRect.bottom + gap;
  let left = selectionRect.left + selectionRect.width / 2 - 160;

  if (left < 8) left = 8;
  if (left + 320 > window.innerWidth - 8) left = window.innerWidth - 328;
  if (top + 120 > window.innerHeight - 8) top = selectionRect.top - 120 - gap;

  useEffect(() => {
    let cancelled = false;

    defineText(text)
      .then((result) => {
        if (!cancelled) {
          setDefinition(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to define");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  // Click-outside and Escape dismiss
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[60] max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-2xl"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-accent)]">Define</span>
        <button
          onClick={onClose}
          className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        >
          <X size={14} />
        </button>
      </div>
      <p className="text-xs font-medium text-[var(--color-text)]">
        &ldquo;{text.length > 60 ? text.slice(0, 60) + "..." : text}&rdquo;
      </p>
      <div className="mt-2 text-xs leading-relaxed text-[var(--color-text-dim)]">
        {loading && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        )}
        {error && <span className="text-[var(--color-red)]">{error}</span>}
        {definition && <p>{definition}</p>}
      </div>
    </div>,
    document.body,
  );
}
