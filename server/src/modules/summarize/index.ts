// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type {
  AIConfig,
  SummaryLength,
  SummarizeResponse,
  ChatMessage,
} from "@futurebuddy/shared";
import { extractContent } from "./extractor.js";
import { buildSummarizePrompt } from "./prompts.js";
import { getCachedSummary, cacheSummary, cleanExpiredSummaries } from "./cache.js";
import { getAIProvider } from "../ai/router.js";

export { extractContent } from "./extractor.js";
export { buildUrlContextPrompt } from "./prompts.js";
export { cleanExpiredSummaries } from "./cache.js";

export async function summarize(
  url: string,
  length: SummaryLength,
  db: Database,
  aiConfig: AIConfig,
): Promise<SummarizeResponse> {
  // Check cache first
  const cached = getCachedSummary(db, url, length);
  if (cached) return cached;

  // Extract content from URL
  const extracted = await extractContent(url);

  // Build prompt and get AI summary
  const prompt = buildSummarizePrompt(extracted.text, extracted.type, length, extracted.title);
  const messages: ChatMessage[] = [
    { role: "user", content: prompt, timestamp: new Date().toISOString() },
  ];

  const provider = getAIProvider(aiConfig);
  const summary = await provider.chat(messages, aiConfig);

  // Cache the result
  cacheSummary(db, url, length, summary, extracted.title, extracted.type, extracted.text, aiConfig.provider);

  return {
    summary,
    title: extracted.title,
    source: url,
    type: extracted.type,
    wordCount: summary.split(/\s+/).length,
    cached: false,
  };
}

export async function summarizeStream(
  url: string,
  length: SummaryLength,
  db: Database,
  aiConfig: AIConfig,
  onChunk: (chunk: string) => void,
): Promise<SummarizeResponse> {
  // Check cache first — if cached, send all at once
  const cached = getCachedSummary(db, url, length);
  if (cached) {
    onChunk(cached.summary);
    return cached;
  }

  // Extract content from URL
  const extracted = await extractContent(url);

  // Build prompt and stream AI summary
  const prompt = buildSummarizePrompt(extracted.text, extracted.type, length, extracted.title);
  const messages: ChatMessage[] = [
    { role: "user", content: prompt, timestamp: new Date().toISOString() },
  ];

  const provider = getAIProvider(aiConfig);

  let summary: string;
  if (provider.streamChat) {
    summary = await provider.streamChat(messages, aiConfig, onChunk);
  } else {
    summary = await provider.chat(messages, aiConfig);
    onChunk(summary);
  }

  // Cache the result
  cacheSummary(db, url, length, summary, extracted.title, extracted.type, extracted.text, aiConfig.provider);

  return {
    summary,
    title: extracted.title,
    source: url,
    type: extracted.type,
    wordCount: summary.split(/\s+/).length,
    cached: false,
  };
}

// Clean expired summaries at module load (best-effort)
export function initSummarizeModule(db: Database): void {
  try {
    cleanExpiredSummaries(db);
  } catch {
    // Cleanup is best-effort
  }
}
