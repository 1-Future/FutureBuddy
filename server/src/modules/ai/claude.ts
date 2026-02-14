// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig, ChatMessage } from "@futurebuddy/shared";
import type { AIProviderInterface } from "./provider.js";

const SYSTEM_PROMPT = `You are FutureBuddy, an AI-powered IT assistant made by #1 Future. You help users manage their computer — setting up systems, organizing files, fixing issues, securing machines, and answering any IT question. You are friendly, knowledgeable, and proactive.

When you recommend system changes, provide the exact commands in code blocks (powershell, cmd, or bash). Be specific about what each command does and why.

For potentially dangerous operations, warn the user clearly before suggesting them.`;

export class ClaudeProvider implements AIProviderInterface {
  name = "Claude";

  async chat(messages: ChatMessage[], config: AIConfig): Promise<string> {
    if (!config.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for Claude provider");
    }

    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as any;
    return data.content?.[0]?.text || "No response from Claude.";
  }

  async isAvailable(config: AIConfig): Promise<boolean> {
    return !!config.apiKey;
  }
}
