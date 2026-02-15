// Copyright 2025 #1 Future — Apache 2.0 License

import type { ParsedSession } from "../sessions/parser.js";

export interface ScrubRules {
  stripPaths: boolean;
  stripKeys: boolean;
  stripIPs: boolean;
  stripEmails: boolean;
  customPatterns?: RegExp[];
}

export const DEFAULT_RULES: ScrubRules = {
  stripPaths: true,
  stripKeys: true,
  stripIPs: true,
  stripEmails: true,
};

// ── Path patterns ─────────────────────────────────────────────────────

const PATH_PATTERNS = [
  // Windows paths: C:\Users\..., D:\some\path, etc.
  /[A-Z]:\\(?:Users|Documents and Settings|Program Files(?: \(x86\))?|Windows|ProgramData)\\[^\s"'`,;)}\]]+/gi,
  // Generic Windows drive paths with at least one backslash segment
  /[A-Z]:\\[^\s"'`,;)}\]]*\\[^\s"'`,;)}\]]+/gi,
  // Unix home paths: /home/..., /Users/..., /root/...
  /\/(?:home|Users|root)\/[^\s"'`,;)}\]]+/g,
  // Unix common paths: /etc/..., /var/..., /tmp/..., /opt/...
  /\/(?:etc|var|tmp|opt)\/[^\s"'`,;)}\]]+/g,
];

// ── Key / secret patterns ─────────────────────────────────────────────

const KEY_PATTERNS = [
  // OpenAI / Anthropic style keys: sk-...
  /sk-[A-Za-z0-9_-]{20,}/g,
  // AWS access keys: AKIA...
  /AKIA[A-Z0-9]{16}/g,
  // GitHub tokens: ghp_, gho_, ghu_, ghs_, ghr_
  /gh[pousr]_[A-Za-z0-9_]{36,}/g,
  // Generic "key=VALUE" or "token=VALUE" in query strings or env vars
  /(?:api[_-]?key|token|secret|password|auth|bearer)\s*[=:]\s*["']?[A-Za-z0-9_\-/.+]{16,}["']?/gi,
  // Long hex strings (32+ chars) that look like API keys
  /\b[0-9a-fA-F]{32,}\b/g,
  // Base64-encoded tokens (40+ chars, no spaces)
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,
  // Bearer tokens in headers
  /Bearer\s+[A-Za-z0-9_\-/.+]{20,}/g,
];

// ── IP address pattern ────────────────────────────────────────────────

// Match IPs but avoid version-number-like patterns (e.g., 1.2.3 or v2.0.1)
const IP_PATTERN = /(?<![.\dv])\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b(?!\.\d)/g;

// ── Email pattern ─────────────────────────────────────────────────────

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Scrub sensitive data from a text string based on the provided rules.
 */
export function scrubText(text: string, rules: ScrubRules = DEFAULT_RULES): string {
  let result = text;

  if (rules.stripPaths) {
    for (const pattern of PATH_PATTERNS) {
      result = result.replace(pattern, "[PATH]");
    }
  }

  if (rules.stripKeys) {
    for (const pattern of KEY_PATTERNS) {
      result = result.replace(pattern, "[REDACTED]");
    }
  }

  if (rules.stripIPs) {
    result = result.replace(IP_PATTERN, "[IP]");
  }

  if (rules.stripEmails) {
    result = result.replace(EMAIL_PATTERN, "[EMAIL]");
  }

  if (rules.customPatterns) {
    for (const pattern of rules.customPatterns) {
      result = result.replace(pattern, "[REDACTED]");
    }
  }

  return result;
}

/**
 * Scrub all entries in a parsed session, returning a new session object
 * with sensitive data replaced by placeholder tokens.
 */
export function scrubSession(
  session: ParsedSession,
  rules: ScrubRules = DEFAULT_RULES,
): ParsedSession {
  return {
    ...session,
    filePath: "[PATH]",
    summary: scrubText(session.summary, rules),
    entries: session.entries.map((entry) => ({
      ...entry,
      content: scrubText(entry.content, rules),
    })),
  };
}
