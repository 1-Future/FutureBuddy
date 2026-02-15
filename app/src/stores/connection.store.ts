import { create } from 'zustand';

type WSState = 'disconnected' | 'connecting' | 'connected';

interface ConnectionState {
  serverUrl: string;
  wsState: WSState;
  pendingBadgeCount: number;
  setServerUrl: (url: string) => void;
  setWSState: (state: WSState) => void;
  setPendingBadgeCount: (count: number) => void;
  incrementBadge: () => void;
  decrementBadge: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  serverUrl: 'http://192.168.1.93:3000',
  wsState: 'disconnected',
  pendingBadgeCount: 0,
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setWSState: (wsState) => set({ wsState }),
  setPendingBadgeCount: (count) => set({ pendingBadgeCount: count }),
  incrementBadge: () => set((s) => ({ pendingBadgeCount: s.pendingBadgeCount + 1 })),
  decrementBadge: () => set((s) => ({ pendingBadgeCount: Math.max(0, s.pendingBadgeCount - 1) })),
}));
