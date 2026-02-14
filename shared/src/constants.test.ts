import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  VERSION,
  DEFAULT_PORT,
  DEFAULT_HOST,
  ACTION_TIERS,
  AI_PROVIDERS,
} from "./constants.js";

describe("constants", () => {
  it("exports APP_NAME", () => {
    expect(APP_NAME).toBe("FutureBuddy");
  });

  it("exports VERSION in semver format", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("exports DEFAULT_PORT as 3000", () => {
    expect(DEFAULT_PORT).toBe(3000);
  });

  it("exports DEFAULT_HOST", () => {
    expect(DEFAULT_HOST).toBe("0.0.0.0");
  });
});

describe("ACTION_TIERS", () => {
  it("defines all 3 tiers", () => {
    expect(ACTION_TIERS).toHaveProperty("green");
    expect(ACTION_TIERS).toHaveProperty("yellow");
    expect(ACTION_TIERS).toHaveProperty("red");
  });

  it("each tier has label, description, and requiresApproval", () => {
    for (const tier of Object.values(ACTION_TIERS)) {
      expect(tier).toHaveProperty("label");
      expect(tier).toHaveProperty("description");
      expect(tier).toHaveProperty("requiresApproval");
      expect(typeof tier.label).toBe("string");
      expect(typeof tier.description).toBe("string");
      expect(typeof tier.requiresApproval).toBe("boolean");
    }
  });

  it("green and yellow do not require approval, red does", () => {
    expect(ACTION_TIERS.green.requiresApproval).toBe(false);
    expect(ACTION_TIERS.yellow.requiresApproval).toBe(false);
    expect(ACTION_TIERS.red.requiresApproval).toBe(true);
  });
});

describe("AI_PROVIDERS", () => {
  it("defines all 4 providers", () => {
    expect(AI_PROVIDERS).toHaveProperty("ollama");
    expect(AI_PROVIDERS).toHaveProperty("claude");
    expect(AI_PROVIDERS).toHaveProperty("openai");
    expect(AI_PROVIDERS).toHaveProperty("gemini");
  });

  it("each provider has name, description, and defaultModel", () => {
    for (const provider of Object.values(AI_PROVIDERS)) {
      expect(provider).toHaveProperty("name");
      expect(provider).toHaveProperty("description");
      expect(provider).toHaveProperty("defaultModel");
      expect(typeof provider.name).toBe("string");
      expect(typeof provider.description).toBe("string");
      expect(typeof provider.defaultModel).toBe("string");
    }
  });

  it("ollama has a defaultBaseUrl", () => {
    expect(AI_PROVIDERS.ollama.defaultBaseUrl).toBe("http://localhost:11434");
  });
});
