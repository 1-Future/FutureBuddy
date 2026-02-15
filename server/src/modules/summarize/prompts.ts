// Copyright 2025 #1 Future — Apache 2.0 License

import type { ContentType, SummaryLength, ExtractedContent } from "@futurebuddy/shared";
import { SUMMARY_LENGTHS } from "@futurebuddy/shared";

const TYPE_GUIDANCE: Record<ContentType, string> = {
  article:
    "Focus on the main argument, key evidence, and conclusions. Highlight any data or statistics mentioned.",
  youtube:
    "Summarize the topics covered chronologically. Note key points, any demonstrations, and the main takeaway.",
  pdf: "Identify the document's purpose, main findings or content, and any conclusions or recommendations.",
};

// Cap extracted text to avoid blowing up LLM context windows
const MAX_SUMMARIZE_CHARS = 30_000;

export function buildSummarizePrompt(
  text: string,
  type: ContentType,
  length: SummaryLength,
  title?: string,
): string {
  const wordTarget = SUMMARY_LENGTHS[length].words;
  const typeHint = TYPE_GUIDANCE[type];

  const trimmedText =
    text.length > MAX_SUMMARIZE_CHARS
      ? text.slice(0, MAX_SUMMARIZE_CHARS) + "\n\n[Content truncated...]"
      : text;

  return `Summarize the following ${type} content in plain English.

${title ? `Title: "${title}"\n` : ""}
Guidelines:
- Target approximately ${wordTarget} words
- ${typeHint}
- Use clear, accessible language — no jargon unless it's essential
- ${length === "short" ? "Focus on key takeaways only" : length === "medium" ? "Use bullet points for main ideas" : "Organize into sections with headers"}
- Do NOT include any preamble like "Here is a summary" — just start with the content

Content:
${trimmedText}`;
}

export function buildUrlContextPrompt(extracted: ExtractedContent): string {
  const maxChars = 8000;
  const trimmedText =
    extracted.text.length > maxChars
      ? extracted.text.slice(0, maxChars) + "\n\n[Content truncated...]"
      : extracted.text;

  const meta: string[] = [];
  if (extracted.metadata?.author) meta.push(`Author: ${extracted.metadata.author}`);
  if (extracted.metadata?.channel) meta.push(`Channel: ${extracted.metadata.channel}`);
  if (extracted.metadata?.duration) meta.push(`Duration: ${extracted.metadata.duration}`);
  if (extracted.metadata?.siteName) meta.push(`Site: ${extracted.metadata.siteName}`);

  return `The user shared a URL. Here is the extracted content for context:

URL: ${extracted.url}
Title: ${extracted.title}
Type: ${extracted.type}
${meta.length > 0 ? meta.join("\n") + "\n" : ""}
--- Content ---
${trimmedText}
--- End Content ---

Use this content to answer the user's question. If they didn't ask a specific question, provide a helpful summary.`;
}
