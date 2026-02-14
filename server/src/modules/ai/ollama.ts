// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig, ChatMessage } from "@futurebuddy/shared";
import type { AIProviderInterface } from "./provider.js";

const SYSTEM_PROMPT = `You are FutureBuddy, an AI-powered IT assistant made by #1 Future. You help users manage their computer — setting up systems, organizing files, fixing issues, securing machines, and answering any IT question. You are friendly, knowledgeable, and proactive.

When you recommend system changes, provide the exact commands in code blocks (powershell, cmd, or bash). Be specific about what each command does and why.

For potentially dangerous operations, warn the user clearly before suggesting them.`;

export class OllamaProvider implements AIProviderInterface {
  name = "Ollama";

  async chat(messages: ChatMessage[], config: AIConfig): Promise<string> {
    const baseUrl = config.baseUrl || "http://localhost:11434";

    const ollamaMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: ollamaMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.message?.content || "No response from Ollama.";
  }

  async streamChat(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const baseUrl = config.baseUrl || "http://localhost:11434";

    const ollamaMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: ollamaMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    let fullContent = "";
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n").filter(Boolean)) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            fullContent += parsed.message.content;
            onChunk(parsed.message.content);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    return fullContent;
  }

  async isAvailable(config: AIConfig): Promise<boolean> {
    try {
      const baseUrl = config.baseUrl || "http://localhost:11434";
      const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return response.ok;
    } catch {
      return false;
    }
  }
}
