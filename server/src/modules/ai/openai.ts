// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig, ChatMessage } from "@futurebuddy/shared";
import type { AIProviderInterface } from "./provider.js";

const SYSTEM_PROMPT = `You are FutureBuddy, an AI-powered IT assistant made by #1 Future. You help users manage their computer — setting up systems, organizing files, fixing issues, securing machines, and answering any IT question. You are friendly, knowledgeable, and proactive.

When you recommend system changes, provide the exact commands in code blocks (powershell, cmd, or bash). Be specific about what each command does and why.

For potentially dangerous operations, warn the user clearly before suggesting them.`;

export class OpenAIProvider implements AIProviderInterface {
  name = "OpenAI";

  async chat(messages: ChatMessage[], config: AIConfig): Promise<string> {
    if (!config.apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI provider");
    }

    const openaiMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: openaiMessages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || "No response from OpenAI.";
  }

  async isAvailable(config: AIConfig): Promise<boolean> {
    return !!config.apiKey;
  }
}
