import { create } from 'zustand';

interface SettingsState {
  sttLanguage: string;
  setSttLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  sttLanguage: 'en',
  setSttLanguage: (sttLanguage) => set({ sttLanguage }),
}));
