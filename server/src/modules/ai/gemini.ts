// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig, ChatMessage } from "@futurebuddy/shared";
import type { AIProviderInterface } from "./provider.js";

const SYSTEM_PROMPT = `You are FutureBuddy, an AI-powered IT assistant made by #1 Future. You help users manage their computer — setting up systems, organizing files, fixing issues, securing machines, and answering any IT question. You are friendly, knowledgeable, and proactive.

When you recommend system changes, provide the exact commands in code blocks (powershell, cmd, or bash). Be specific about what each command does and why.

For potentially dangerous operations, warn the user clearly before suggesting them.`;

export class GeminiProvider implements AIProviderInterface {
  name = "Gemini";

  async chat(messages: ChatMessage[], config: AIConfig): Promise<string> {
    if (!config.apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is required for Gemini provider");
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
  }

  async isAvailable(config: AIConfig): Promise<boolean> {
    return !!config.apiKey;
  }
}
