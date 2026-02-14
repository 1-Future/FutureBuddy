// Copyright 2025 #1 Future — Apache 2.0 License

import { resolve } from "node:path";
import type { ServerConfig, AIProvider } from "@futurebuddy/shared";
import { DEFAULT_PORT, DEFAULT_HOST, AI_PROVIDERS } from "@futurebuddy/shared";

export function loadConfig(): ServerConfig {
  const provider = (process.env.AI_PROVIDER || "ollama") as AIProvider;
  const providerDefaults = AI_PROVIDERS[provider];

  return {
    port: parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
    host: process.env.HOST || DEFAULT_HOST,
    dbPath: resolve(process.env.DB_PATH || "./data/futurebuddy.db"),
    ai: {
      provider,
      model: process.env.AI_MODEL || providerDefaults.defaultModel,
      baseUrl:
        process.env.OLLAMA_BASE_URL ||
        ("defaultBaseUrl" in providerDefaults ? providerDefaults.defaultBaseUrl : undefined),
      apiKey:
        process.env.ANTHROPIC_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        undefined,
    },
  };
}
