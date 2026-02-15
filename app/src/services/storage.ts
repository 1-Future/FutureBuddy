import * as SecureStore from 'expo-secure-store';

const KEYS = {
  SERVER_URL: 'fb_server_url',
  STT_LANGUAGE: 'fb_stt_language',
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
