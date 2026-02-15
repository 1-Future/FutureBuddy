import { create } from 'zustand';
import type { Action } from '../types/models';

interface ActionsState {
  actions: Action[];
  setActions: (actions: Action[]) => void;
  addAction: (action: Action) => void;
  removeAction: (id: string) => void;
  updateAction: (action: Action) => void;
}

export const useActionsStore = create<ActionsState>((set) => ({
  actions: [],
  setActions: (actions) => set({ actions }),
  addAction: (action) => set((s) => ({ actions: [action, ...s.actions] })),
  removeAction: (id) =>
    set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),
  updateAction: (action) =>
    set((s) => ({
      actions: s.actions.map((a) => (a.id === action.id ? action : a)),
    })),
}));
