// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig } from "@futurebuddy/shared";
import type { AIProviderInterface } from "./provider.js";
import { OllamaProvider } from "./ollama.js";
import { ClaudeProvider } from "./claude.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";

const providers: Record<string, AIProviderInterface> = {
  ollama: new OllamaProvider(),
  claude: new ClaudeProvider(),
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
};

export function getAIProvider(config: AIConfig): AIProviderInterface {
  const provider = providers[config.provider];
  if (!provider) {
    throw new Error(
      `Unknown AI provider: ${config.provider}. Available: ${Object.keys(providers).join(", ")}`,
    );
  }
  return provider;
}

export async function getAvailableProviders(config: AIConfig): Promise<string[]> {
  const available: string[] = [];
  for (const [name, provider] of Object.entries(providers)) {
    const providerConfig = { ...config, provider: name as AIConfig["provider"] };
    if (await provider.isAvailable(providerConfig)) {
      available.push(name);
    }
  }
  return available;
}
