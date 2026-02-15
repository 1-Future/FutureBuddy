// Copyright 2025 #1 Future — Apache 2.0 License

import { createHash, randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import type { SummaryLength, ContentType, SummarizeResponse } from "@futurebuddy/shared";
import { SUMMARY_CACHE_TTL_MS } from "@futurebuddy/shared";
import { queryOne, execute } from "../../db/index.js";

function buildCacheKey(url: string, length: SummaryLength): string {
  // Normalize URL: lowercase, strip trailing slash, strip fragment
  const normalized = url.toLowerCase().replace(/\/$/, "").replace(/#.*$/, "");
  return createHash("sha256").update(`${normalized}:${length}`).digest("hex");
}

export function getCachedSummary(
  db: Database,
  url: string,
  length: SummaryLength,
): SummarizeResponse | null {
  const urlHash = buildCacheKey(url, length);

  const row = queryOne(
    db,
    "SELECT summary, title, content_type, url, summary_length FROM summaries WHERE url_hash = ? AND expires_at > datetime('now')",
    [urlHash],
  );

  if (!row || !row.summary) return null;

  return {
    summary: row.summary as string,
    title: (row.title as string) || "Untitled",
    source: row.url as string,
    type: row.content_type as ContentType,
    wordCount: (row.summary as string).split(/\s+/).length,
    cached: true,
  };
}

export function cacheSummary(
  db: Database,
  url: string,
  length: SummaryLength,
  summary: string,
  title: string,
  type: ContentType,
  extractedText: string,
  provider: string,
): void {
  const id = randomUUID();
  const urlHash = buildCacheKey(url, length);
  const expiresAt = new Date(Date.now() + SUMMARY_CACHE_TTL_MS).toISOString();

  // Delete any existing entry for this url+length combo
  execute(db, "DELETE FROM summaries WHERE url_hash = ?", [urlHash]);

  execute(
    db,
    `INSERT INTO summaries (id, url_hash, url, title, content_type, extracted_text, summary, summary_length, provider, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, urlHash, url, title, type, extractedText, summary, length, provider, expiresAt],
  );
}

export function cleanExpiredSummaries(db: Database): void {
  execute(db, "DELETE FROM summaries WHERE expires_at < datetime('now')");
}
