// Copyright 2025 #1 Future — Apache 2.0 License

import type { AIConfig } from "@futurebuddy/shared";

export async function getEmbedding(text: string, config: AIConfig): Promise<number[]> {
  switch (config.provider) {
    case "ollama":
      return getOllamaEmbedding(text, config);
    case "openai":
      return getOpenAIEmbedding(text, config);
    default:
      // For providers without embedding support, use Ollama as fallback
      return getOllamaEmbedding(text, {
        ...config,
        baseUrl: config.baseUrl || "http://localhost:11434",
      });
  }
}

async function getOllamaEmbedding(text: string, config: AIConfig): Promise<number[]> {
  const baseUrl = config.baseUrl || "http://localhost:11434";
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding error: ${response.status}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}

async function getOpenAIEmbedding(text: string, config: AIConfig): Promise<number[]> {
  if (!config.apiKey) throw new Error("OpenAI API key required for embeddings");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = (await response.json()) as { data: [{ embedding: number[] }] };
  return data.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
