// Copyright 2025 #1 Future — Apache 2.0 License

export interface ExtractedUrl {
  url: string;
  title?: string;
  context: string;
  source: "session" | "chat" | "manual";
  sourceId?: string;
}

// Regex for markdown links: [title](url)
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

// Regex for bare URLs (http/https)
const BARE_URL_RE = /(?<!\]\()https?:\/\/[^\s<>\])"'`,;]+/g;

// Domains/patterns to ignore
const IGNORED_PATTERNS = [
  /^https?:\/\/localhost/,
  /^https?:\/\/127\.0\.0\.1/,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/\[::1\]/,
  /^data:/,
  /^file:\/\//,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
];

function isIgnored(url: string): boolean {
  return IGNORED_PATTERNS.some((re) => re.test(url));
}

function getContext(text: string, url: string, radius = 50): string {
  const idx = text.indexOf(url);
  if (idx === -1) return "";
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + url.length + radius);
  let ctx = text.slice(start, end).replace(/\n/g, " ").trim();
  if (start > 0) ctx = "..." + ctx;
  if (end < text.length) ctx = ctx + "...";
  return ctx;
}

/**
 * Extract URLs from text content.
 * Handles markdown links, bare URLs, deduplicates, and filters ignored patterns.
 */
export function extractUrls(
  text: string,
  source: "session" | "chat" | "manual",
  sourceId?: string,
): ExtractedUrl[] {
  const seen = new Set<string>();
  const results: ExtractedUrl[] = [];

  // First pass: markdown links (these have titles)
  let match: RegExpExecArray | null;
  const mdRe = new RegExp(MARKDOWN_LINK_RE.source, MARKDOWN_LINK_RE.flags);
  while ((match = mdRe.exec(text)) !== null) {
    const title = match[1].trim();
    const url = cleanUrl(match[2]);
    if (isIgnored(url) || seen.has(url)) continue;
    seen.add(url);
    results.push({
      url,
      title: title || undefined,
      context: getContext(text, match[2]),
      source,
      sourceId,
    });
  }

  // Second pass: bare URLs (not already captured from markdown)
  const bareRe = new RegExp(BARE_URL_RE.source, BARE_URL_RE.flags);
  while ((match = bareRe.exec(text)) !== null) {
    const url = cleanUrl(match[0]);
    if (isIgnored(url) || seen.has(url)) continue;
    seen.add(url);
    results.push({
      url,
      context: getContext(text, match[0]),
      source,
      sourceId,
    });
  }

  return results;
}

/** Strip trailing punctuation that gets accidentally captured */
function cleanUrl(url: string): string {
  return url.replace(/[.)>,;:!?]+$/, "");
}
