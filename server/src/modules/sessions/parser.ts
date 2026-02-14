// Copyright 2025 #1 Future — Apache 2.0 License

import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

export interface SessionEntry {
  type: "user" | "assistant" | "tool_use" | "tool_result";
  content: string;
  timestamp?: string;
}

export interface ParsedSession {
  id: string;
  filePath: string;
  entries: SessionEntry[];
  summary: string;
  messageCount: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Extract text content from a JSONL message content field.
 * Content can be a string or an array of content blocks.
 */
function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === "string") {
      parts.push(block);
    } else if (block && typeof block === "object") {
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") {
        parts.push(b.text);
      }
    }
  }
  return parts.join("\n");
}

/**
 * Extract tool use entries from a content array.
 * Returns an array of brief descriptions like "Read(file_path)".
 */
function extractToolUses(content: unknown): { name: string; description: string }[] {
  if (!Array.isArray(content)) return [];

  const tools: { name: string; description: string }[] = [];
  for (const block of content) {
    if (block && typeof block === "object") {
      const b = block as Record<string, unknown>;
      if (b.type === "tool_use" && typeof b.name === "string") {
        const input = b.input as Record<string, unknown> | undefined;
        let desc = b.name;
        if (input) {
          // Create a brief summary from the first relevant input field
          const keys = Object.keys(input);
          if (keys.length > 0) {
            const firstVal = String(input[keys[0]] ?? "").slice(0, 80);
            desc = `${b.name}(${firstVal}${String(input[keys[0]] ?? "").length > 80 ? "..." : ""})`;
          }
        }
        tools.push({ name: b.name, description: desc });
      }
    }
  }
  return tools;
}

/**
 * Parse a single Claude Code JSONL session file into a structured format.
 */
export async function parseSessionFile(filePath: string): Promise<ParsedSession> {
  const raw = await readFile(filePath, "utf-8");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);

  const entries: SessionEntry[] = [];
  let firstTimestamp = "";
  let lastTimestamp = "";
  let firstUserMessage = "";

  for (const line of lines) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      // Skip malformed lines
      continue;
    }

    const timestamp = typeof parsed.timestamp === "string" ? parsed.timestamp : undefined;
    const lineType = parsed.type;

    // Track timestamps
    if (timestamp) {
      if (!firstTimestamp) firstTimestamp = timestamp;
      lastTimestamp = timestamp;
    }

    // Skip non-message lines (file-history-snapshot, etc.)
    if (lineType !== "user" && lineType !== "assistant" && lineType !== "result") {
      continue;
    }

    const message = parsed.message as Record<string, unknown> | undefined;

    if (lineType === "user" && message) {
      const text = extractTextContent(message.content);
      if (text) {
        entries.push({ type: "user", content: text, timestamp });
        if (!firstUserMessage) firstUserMessage = text;
      }
    }

    if (lineType === "assistant" && message) {
      const content = message.content;

      // Extract text content from assistant
      const text = extractTextContent(content);
      if (text) {
        entries.push({ type: "assistant", content: text, timestamp });
      }

      // Extract tool uses
      const toolUses = extractToolUses(content);
      for (const tool of toolUses) {
        entries.push({
          type: "tool_use",
          content: tool.description,
          timestamp,
        });
      }
    }

    if (lineType === "result") {
      const result = parsed.result as Record<string, unknown> | undefined;
      if (result) {
        const resultContent =
          typeof result.content === "string"
            ? result.content.slice(0, 200)
            : typeof result.output === "string"
              ? (result.output as string).slice(0, 200)
              : "";
        if (resultContent) {
          entries.push({
            type: "tool_result",
            content: resultContent,
            timestamp,
          });
        }
      }
    }
  }

  // Derive session ID from filename (UUID)
  const filename = basename(filePath, ".jsonl");

  // Generate summary from first user message
  const summary = firstUserMessage
    ? firstUserMessage.slice(0, 200) + (firstUserMessage.length > 200 ? "..." : "")
    : "Empty session";

  return {
    id: filename,
    filePath,
    entries,
    summary,
    messageCount: entries.filter((e) => e.type === "user" || e.type === "assistant").length,
    startedAt: firstTimestamp || new Date().toISOString(),
    endedAt: lastTimestamp || new Date().toISOString(),
  };
}

/**
 * Recursively find all .jsonl session files in the given directory.
 */
export async function findSessionFiles(baseDir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(baseDir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        // Node 20+ uses parentPath, older versions use path
        const dirent = entry as unknown as Record<string, unknown>;
        const parentDir = (dirent.parentPath ?? dirent.path ?? baseDir) as string;
        files.push(join(parentDir, entry.name));
      }
    }
  } catch {
    // Directory doesn't exist or is inaccessible
  }

  return files;
}
