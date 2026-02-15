// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig, ChatMessage } from "@futurebuddy/shared";
import type { AIProviderInterface } from "./provider.js";

const SYSTEM_PROMPT = `You are FutureBuddy, an AI-powered IT assistant made by #1 Future. You help users manage their computer — setting up systems, organizing files, fixing issues, securing machines, and answering any IT question. You are friendly, knowledgeable, and proactive.

When you recommend system changes, provide the exact commands in code blocks (powershell, cmd, or bash). Be specific about what each command does and why.

For potentially dangerous operations, warn the user clearly before suggesting them.`;

export class OpenAIProvider implements AIProviderInterface {
  name = "OpenAI";

  private buildMessages(messages: ChatMessage[]) {
    return [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];
  }

  private getBaseUrl(config: AIConfig): string {
    return config.baseUrl || "https://api.openai.com/v1";
  }

  async chat(messages: ChatMessage[], config: AIConfig): Promise<string> {
    if (!config.apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI provider");
    }

    const response = await fetch(`${this.getBaseUrl(config)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: this.buildMessages(messages),
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

  async streamChat(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    if (!config.apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI provider");
    }

    const response = await fetch(`${this.getBaseUrl(config)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: this.buildMessages(messages),
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        try {
          const data = JSON.parse(payload);
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            onChunk(delta);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    return fullResponse;
  }

  async isAvailable(config: AIConfig): Promise<boolean> {
    return !!config.apiKey;
  }
}
