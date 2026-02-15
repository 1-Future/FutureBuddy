// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useEffect, useCallback, type RefObject } from "react";

interface SelectionState {
  selectedText: string;
  selectionRect: DOMRect | null;
  clearSelection: () => void;
}

export function useTextSelection(containerRef: RefObject<HTMLElement | null>): SelectionState {
  const [selectedText, setSelectedText] = useState("");
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedText("");
    setSelectionRect(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = () => {
      clearSelection();
    };

    const handleSelectionChange = () => {
      // Use rAF to let the browser finalize the selection
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          return;
        }

        // Verify the selection is within our container
        const anchorNode = selection.anchorNode;
        if (!anchorNode || !container.contains(anchorNode)) {
          return;
        }

        const text = selection.toString().trim();
        if (text.length < 2) return;

        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectedText(text);
          setSelectionRect(rect);
        } catch {
          // Selection might be invalid
        }
      });
    };

    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [containerRef, clearSelection]);

  return { selectedText, selectionRect, clearSelection };
}
