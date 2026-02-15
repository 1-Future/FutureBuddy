// Copyright 2025 #1 Future — Apache 2.0 License

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BookOpen, HelpCircle, Search, Lightbulb } from "lucide-react";

interface SelectionMenuProps {
  selectionRect: DOMRect;
  onDefine: () => void;
  onExplain: () => void;
  onResearch?: () => void;
  onIdea?: () => void;
  onDismiss: () => void;
}

export function SelectionMenu({
  selectionRect,
  onDefine,
  onExplain,
  onResearch,
  onIdea,
  onDismiss,
}: SelectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Position: centered above selection, flip below if near top
  const menuWidth = onResearch ? 280 : 160;
  const menuHeight = 64;
  const gap = 8;

  let top = selectionRect.top - menuHeight - gap;
  let left = selectionRect.left + selectionRect.width / 2 - menuWidth / 2;

  // Flip below if too close to top
  if (top < 8) {
    top = selectionRect.bottom + gap;
  }

  // Clamp horizontal
  if (left < 8) left = 8;
  if (left + menuWidth > window.innerWidth - 8) {
    left = window.innerWidth - menuWidth - 8;
  }

  // Click-outside dismiss
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onDismiss]);

  const buttons = [
    { icon: BookOpen, label: "Define", action: onDefine },
    { icon: HelpCircle, label: "Explain", action: onExplain },
    ...(onResearch ? [{ icon: Search, label: "Research", action: onResearch }] : []),
    ...(onIdea ? [{ icon: Lightbulb, label: "Idea", action: onIdea }] : []),
  ];

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[60] flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 shadow-2xl"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {buttons.map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          onClick={action}
          className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
