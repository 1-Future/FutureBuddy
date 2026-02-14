// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type { AIConfig, ChatMessage, MemoryCategory } from "@futurebuddy/shared";
import { createMemory, findDuplicate } from "./manager.js";

interface ExtractedMemory {
  content: string;
  category: MemoryCategory;
  importance: number;
}

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a conversation between a user and an AI assistant, extract discrete facts, preferences, events, skills, relationships, or context worth remembering about the user.

Rules:
- Extract ONLY information about the USER, not the assistant
- Each memory should be a single, self-contained fact
- Use third person ("User prefers...", "User owns...", "User lives in...")
- Rate importance 0.0-1.0 (1.0 = critical identity info, 0.3 = casual mention)
- Skip greetings, small talk, and things the AI said
- If there's nothing worth remembering, return an empty array

Respond ONLY with a JSON array, no other text:
[{"content": "...", "category": "fact|preference|event|skill|relationship|context", "importance": 0.5}]`;

export async function extractMemories(
  messages: ChatMessage[],
  conversationId: string,
  db: Database,
  config: AIConfig,
): Promise<void> {
  // Only process the last few messages (the recent exchange)
  const recent = messages.slice(-4);
  if (recent.length === 0) return;

  const conversationText = recent
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  // Ask the LLM to extract memories
  let extracted: ExtractedMemory[];
  try {
    extracted = await callLLMForExtraction(conversationText, config);
  } catch {
    return; // Extraction failed — not critical, skip silently
  }

  // Store each extracted memory (skip duplicates)
  for (const mem of extracted) {
    if (!mem.content || mem.content.length < 5) continue;

    try {
      const duplicate = await findDuplicate(db, mem.content, config);
      if (duplicate) continue; // Already know this

      await createMemory(
        db,
        {
          content: mem.content,
          category: mem.category || "fact",
          importance: Math.min(1, Math.max(0, mem.importance ?? 0.5)),
          source: "conversation",
          sourceId: conversationId,
        },
        config,
      );
    } catch {
      // Individual memory storage failed — continue with others
    }
  }
}

async function callLLMForExtraction(
  conversationText: string,
  config: AIConfig,
): Promise<ExtractedMemory[]> {
  const messages = [
    { role: "system", content: EXTRACTION_PROMPT },
    { role: "user", content: conversationText },
  ];

  let responseText: string;

  switch (config.provider) {
    case "ollama": {
      const baseUrl = config.baseUrl || "http://localhost:11434";
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          options: { temperature: 0.1 },
        }),
      });
      if (!res.ok) throw new Error(`Ollama: ${res.status}`);
      const data = (await res.json()) as any;
      responseText = data.message?.content || "[]";
      break;
    }

    case "openai": {
      if (!config.apiKey) throw new Error("No API key");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.1,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI: ${res.status}`);
      const data = (await res.json()) as any;
      responseText = data.choices?.[0]?.message?.content || "[]";
      break;
    }

    case "claude": {
      if (!config.apiKey) throw new Error("No API key");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: EXTRACTION_PROMPT,
          messages: [{ role: "user", content: conversationText }],
          temperature: 0.1,
        }),
      });
      if (!res.ok) throw new Error(`Claude: ${res.status}`);
      const data = (await res.json()) as any;
      responseText = data.content?.[0]?.text || "[]";
      break;
    }

    case "gemini": {
      if (!config.apiKey) throw new Error("No API key");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${EXTRACTION_PROMPT}\n\n${conversationText}` }] }],
            generationConfig: { temperature: 0.1 },
          }),
        },
      );
      if (!res.ok) throw new Error(`Gemini: ${res.status}`);
      const data = (await res.json()) as any;
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      break;
    }

    default:
      return [];
  }

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
