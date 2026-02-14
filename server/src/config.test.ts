import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@futurebuddy/shared", async () => {
  const actual = await vi.importActual<typeof import("@futurebuddy/shared")>("@futurebuddy/shared");
  return actual;
});

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns defaults when no env vars set", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("PORT", "");
    vi.stubEnv("HOST", "");
    vi.stubEnv("AI_MODEL", "");

    const config = loadConfig();

    expect(config.port).toBe(3000);
    expect(config.host).toBe("0.0.0.0");
    expect(config.ai.provider).toBe("ollama");
    expect(config.ai.model).toBe("llama3.2");
  });

  it("respects PORT env var", () => {
    vi.stubEnv("PORT", "8080");

    const config = loadConfig();
    expect(config.port).toBe(8080);
  });

  it("respects HOST env var", () => {
    vi.stubEnv("HOST", "127.0.0.1");

    const config = loadConfig();
    expect(config.host).toBe("127.0.0.1");
  });

  it("respects AI_PROVIDER env var", () => {
    vi.stubEnv("AI_PROVIDER", "claude");
    vi.stubEnv("AI_MODEL", "");

    const config = loadConfig();
    expect(config.ai.provider).toBe("claude");
    expect(config.ai.model).toBe("claude-sonnet-4-5-20250929");
  });

  it("respects AI_MODEL env var", () => {
    vi.stubEnv("AI_MODEL", "custom-model");

    const config = loadConfig();
    expect(config.ai.model).toBe("custom-model");
  });

  it("picks up API keys from env", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-123");

    const config = loadConfig();
    expect(config.ai.apiKey).toBe("sk-test-123");
  });
});
