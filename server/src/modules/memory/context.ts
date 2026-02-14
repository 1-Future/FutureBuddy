// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type { AIConfig } from "@futurebuddy/shared";
import { searchMemories } from "./manager.js";
import { searchItems } from "../inventory/manager.js";

export async function buildContext(
  db: Database,
  userMessage: string,
  config: AIConfig,
): Promise<string> {
  const sections: string[] = [];

  // Search memories relevant to the user's message
  try {
    const memories = await searchMemories(db, userMessage, config, 8);
    if (memories.length > 0) {
      const memoryLines = memories.map(
        (m) => `- [${m.memory.category}] ${m.memory.content}`,
      );
      sections.push(`## What I remember about you\n${memoryLines.join("\n")}`);
    }
  } catch {
    // Memory search failed — continue without it
  }

  // Search inventory for relevant items
  try {
    const items = searchItems(db, { query: userMessage });
    if (items.length > 0) {
      const itemLines = items.slice(0, 5).map((item) => {
        let line = `- ${item.name}`;
        if (item.brand) line += ` (${item.brand})`;
        if (item.location) line += ` — ${item.location}`;
        if (item.status !== "owned") line += ` [${item.status}]`;
        return line;
      });
      sections.push(`## Relevant items you own\n${itemLines.join("\n")}`);
    }
  } catch {
    // Inventory search failed — continue without it
  }

  if (sections.length === 0) return "";

  return `\n\n---\nContext (use this to personalize your response, but don't explicitly mention "my memory" unless asked):\n\n${sections.join("\n\n")}`;
}
