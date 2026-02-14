// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig, ChatMessage } from "@futurebuddy/shared";

export interface AIProviderInterface {
  name: string;
  chat(messages: ChatMessage[], config: AIConfig): Promise<string>;
  streamChat?(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk: (chunk: string) => void,
  ): Promise<string>;
  isAvailable(config: AIConfig): Promise<boolean>;
}
