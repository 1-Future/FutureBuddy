import { useEffect, useCallback, useState, useRef } from 'react';
import { wsManager } from '../services/ws';
import { createTerminal } from '../services/api';
import { uid } from '../utils/uid';
import type { TerminalDataPayload } from '../types/ws';

export interface ShellTab {
  id: string;
  sessionId: string | null;
  title: string;
  ready: boolean;
}

export function useShell() {
  const [tabs, setTabs] = useState<ShellTab[]>(() => [
    { id: uid(8), sessionId: null, title: 'Shell 1', ready: false },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const tabCounter = useRef(1);

  const startSession = useCallback(async (tabId: string) => {
    try {
      const session = await createTerminal();
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId
            ? { ...tab, sessionId: session.id, ready: true }
            : tab,
        ),
      );
      return session.id;
    } catch (err) {
      console.error('Failed to create terminal session:', err);
      return null;
    }
  }, []);

  const sendData = useCallback((sessionId: string, data: string) => {
    wsManager.sendTerminalData(sessionId, data);
  }, []);

  const resize = useCallback((sessionId: string, cols: number, rows: number) => {
    wsManager.sendTerminalResize(sessionId, cols, rows);
  }, []);

  const addTab = useCallback(() => {
    tabCounter.current++;
    const newTab: ShellTab = {
      id: uid(8),
      sessionId: null,
      title: `Shell ${tabCounter.current}`,
      ready: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== tabId);
        if (filtered.length === 0) {
          tabCounter.current++;
          return [{ id: uid(8), sessionId: null, title: `Shell ${tabCounter.current}`, ready: false }];
        }
        return filtered;
      });

      setActiveTabId((currentActive) => {
        if (currentActive === tabId) {
          const remaining = tabs.filter((t) => t.id !== tabId);
          if (remaining.length === 0) return currentActive;
          const idx = tabs.findIndex((t) => t.id === tabId);
          const newIdx = Math.min(idx, remaining.length - 1);
          return remaining[newIdx].id;
        }
        return currentActive;
      });
    },
    [tabs],
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    startSession,
    sendData,
    resize,
    addTab,
    closeTab,
  };
}
