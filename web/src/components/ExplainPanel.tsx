// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { explainText } from "../services/api.js";

interface ExplainPanelProps {
  text: string;
  onClose: () => void;
}

export function ExplainPanel({ text, onClose }: ExplainPanelProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    explainText(
      text,
      undefined,
      (delta) => {
        if (!cancelled) {
          setContent((prev) => prev + delta);
          // Auto-scroll
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
          });
        }
      },
      () => {
        if (!cancelled) setLoading(false);
      },
    ).catch((err) => {
      if (!cancelled) {
        setError(err.message || "Explain failed");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-[var(--color-accent)]">Explain</span>
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

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="text-sm text-[var(--color-red)]">{error}</p>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
              {content}
              {loading && (
                <span className="inline-block h-4 w-0.5 animate-pulse bg-[var(--color-accent)]" />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
