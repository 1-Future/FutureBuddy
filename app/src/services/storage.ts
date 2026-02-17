import * as SecureStore from 'expo-secure-store';

const KEYS = {
  SERVER_URL: 'fb_server_url',
  STT_LANGUAGE: 'fb_stt_language',
  GRID_SETTINGS: 'fb_grid_settings',
} as const;

export async function saveServerUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SERVER_URL, url);
}

export async function getServerUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.SERVER_URL);
}

export async function saveSttLanguage(lang: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.STT_LANGUAGE, lang);
}

export async function getSttLanguage(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.STT_LANGUAGE);
}

export interface GridSettings {
  gridRows?: number;
  gridCols?: number;
}

export async function saveGridSettings(settings: GridSettings): Promise<void> {
  await SecureStore.setItemAsync(KEYS.GRID_SETTINGS, JSON.stringify(settings));
}

export async function getGridSettings(): Promise<GridSettings | null> {
  const raw = await SecureStore.getItemAsync(KEYS.GRID_SETTINGS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GridSettings;
  } catch {
    return null;
  }
}
