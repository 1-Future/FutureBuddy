// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, Check, Clock, X } from "lucide-react";
import { getPendingNudges, resolveNudge, type Nudge } from "../services/api.js";

const POLL_INTERVAL = 30_000; // 30 seconds
const AUTO_HIDE_DELAY = 30_000; // 30 seconds

export function NudgeToast() {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      setNudge(null);
    }, 300);
  }, []);

  const handleResolve = useCallback(
    async (status: "accepted" | "snoozed" | "dismissed") => {
      if (!nudge) return;
      try {
        await resolveNudge(nudge.id, status);
      } catch {
        // Silently fail — nudge will reappear on next poll if it wasn't resolved
      }
      dismiss();
    },
    [nudge, dismiss],
  );

  // Poll for pending nudges
  useEffect(() => {
    let mounted = true;

    const fetchNudges = async () => {
      try {
        const nudges = await getPendingNudges();
        if (!mounted) return;
        if (nudges.length > 0 && !nudge) {
          setNudge(nudges[0]);
          setVisible(true);
        }
      } catch {
        // Server might be offline — silently ignore
      }
    };

    fetchNudges();
    const interval = setInterval(fetchNudges, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [nudge]);

  // Auto-hide after timeout
  useEffect(() => {
    if (!visible || !nudge) return;

    const timeout = setTimeout(() => {
      dismiss();
    }, AUTO_HIDE_DELAY);

    return () => clearTimeout(timeout);
  }, [visible, nudge, dismiss]);

  if (!visible || !nudge) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition-all duration-300 ${
        exiting
          ? "translate-y-4 opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]/15">
          <Lightbulb size={18} className="text-[var(--color-accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {nudge.title}
          </p>
          <p className="text-xs text-[var(--color-text-dim)]">
            Nudge — {nudge.type}
          </p>
        </div>
        <button
          onClick={() => handleResolve("dismissed")}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-sm text-[var(--color-text-dim)] line-clamp-3">
          {nudge.description}
        </p>
        {nudge.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {nudge.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-4 py-3">
        <button
          onClick={() => handleResolve("accepted")}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Check size={14} />
          Accept
        </button>
        <button
          onClick={() => handleResolve("snoozed")}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <Clock size={14} />
          Snooze
        </button>
        <button
          onClick={() => handleResolve("dismissed")}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <X size={14} />
          Dismiss
        </button>
      </div>
    </div>
  );
}
