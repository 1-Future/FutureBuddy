import { describe, it, expect, vi } from "vitest";

vi.mock("./ollama.js", () => ({
  OllamaProvider: class {
    name = "ollama";
  },
}));
vi.mock("./claude.js", () => ({
  ClaudeProvider: class {
    name = "claude";
  },
}));
vi.mock("./openai.js", () => ({
  OpenAIProvider: class {
    name = "openai";
  },
}));
vi.mock("./gemini.js", () => ({
  GeminiProvider: class {
    name = "gemini";
  },
}));

import { getAIProvider } from "./router.js";
import type { AIConfig } from "@futurebuddy/shared";

function makeConfig(provider: string): AIConfig {
  return { provider: provider as AIConfig["provider"], model: "test-model" };
}

describe("getAIProvider", () => {
  it("returns provider for ollama", () => {
    const provider = getAIProvider(makeConfig("ollama"));
    expect(provider).toBeDefined();
    expect(provider.name).toBe("ollama");
  });

  it("returns provider for claude", () => {
    const provider = getAIProvider(makeConfig("claude"));
    expect(provider).toBeDefined();
    expect(provider.name).toBe("claude");
  });

  it("returns provider for openai", () => {
    const provider = getAIProvider(makeConfig("openai"));
    expect(provider).toBeDefined();
    expect(provider.name).toBe("openai");
  });

  it("returns provider for gemini", () => {
    const provider = getAIProvider(makeConfig("gemini"));
    expect(provider).toBeDefined();
    expect(provider.name).toBe("gemini");
  });

  it("throws for unknown provider", () => {
    expect(() => getAIProvider(makeConfig("fake"))).toThrowError(/Unknown AI provider: fake/);
  });
});
