// Copyright 2025 #1 Future — Apache 2.0 License

// ── Types ────────────────────────────────────────────────────────────

export interface NudgeCandidate {
  type: "snippet" | "pattern" | "solution" | "tutorial";
  title: string;
  description: string;
  content: string;
  noveltyScore: number;
  tags: string[];
}

// ── Tag Detection ────────────────────────────────────────────────────

const TAG_PATTERNS: Record<string, RegExp[]> = {
  typescript: [/\btype\s+\w+\s*=/, /\binterface\s+\w+/, /:\s*(string|number|boolean)\b/, /\.ts\b/],
  react: [/\buseState\b/, /\buseEffect\b/, /\bJSX\b/, /\bReact\b/, /\bcomponent\b/i, /\breturn\s*\(/],
  docker: [/\bDockerfile\b/, /\bdocker[-\s]compose\b/, /\bFROM\s+\w+/, /\bcontainer\b/i],
  debugging: [/\bconsole\.log\b/, /\bdebugger\b/, /\bbreakpoint\b/, /\bstack\s*trace\b/i],
  node: [/\brequire\(/, /\bprocess\.env\b/, /\bfs\b/, /\bpath\b/, /\bnode:/],
  python: [/\bdef\s+\w+/, /\bimport\s+\w+/, /\bclass\s+\w+.*:/, /\bpip\b/],
  sql: [/\bSELECT\b/, /\bINSERT\b/, /\bCREATE\s+TABLE\b/, /\bJOIN\b/],
  css: [/\b(flex|grid)\b/, /\bmargin\b/, /\bpadding\b/, /\btailwind\b/i, /\bclassName\b/],
  git: [/\bgit\s+(commit|push|pull|merge|rebase)\b/, /\b\.gitignore\b/],
  powershell: [/\bGet-\w+/, /\bSet-\w+/, /\bNew-\w+/, /\bRemove-\w+/, /\b\$\w+\s*=/],
  security: [/\bfirewall\b/i, /\bssl\b/i, /\btls\b/i, /\bencrypt\b/i, /\bauth\b/i],
  api: [/\bfetch\(/, /\baxios\b/, /\bREST\b/, /\bGET\b.*\bPOST\b/, /\bendpoint\b/i],
};

/** Less common APIs that boost novelty score */
const UNCOMMON_APIS = [
  /\bProxy\b/, /\bReflect\b/, /\bWeakRef\b/, /\bFinalizationRegistry\b/,
  /\bSharedArrayBuffer\b/, /\bAtomics\b/, /\bstructuredClone\b/,
  /\bAbortController\b/, /\bReadableStream\b/, /\bWritableStream\b/,
  /\bBroadcastChannel\b/, /\bPerformanceObserver\b/,
  /\bIntersectionObserver\b/, /\bMutationObserver\b/,
  /\bWebSocket\b/, /\bWorker\b/, /\bcrypto\.subtle\b/,
  /\bnode:(?!path|fs|os|url)\w+/, /\bsql\.js\b/,
];

// ── Solution Detection ───────────────────────────────────────────────

const SOLUTION_PATTERNS = [
  /i\s+fixed\s+this\s+by/i,
  /the\s+solution\s+was/i,
  /the\s+fix\s+is/i,
  /to\s+resolve\s+this/i,
  /here['']s\s+(?:how|what)\s+(?:i|we)\s+did/i,
  /the\s+(?:trick|key)\s+(?:is|was)/i,
  /turns?\s+out/i,
  /workaround/i,
  /solved\s+(?:it|this)\s+by/i,
  /(?:root\s+)?cause\s+was/i,
];

const TUTORIAL_PATTERNS = [
  /step\s+\d+/i,
  /first,?\s+(?:you|we)\s+need/i,
  /how\s+to\b/i,
  /let['']s\s+(?:start|begin|create|build)/i,
  /in\s+this\s+(?:guide|tutorial)/i,
  /prerequisites/i,
];

// ── Helpers ──────────────────────────────────────────────────────────

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const regex = /```[\w]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1].trim();
    if (code.split("\n").length > 5) {
      blocks.push(code);
    }
  }
  return blocks;
}

function extractDefinitions(text: string): string[] {
  const defs: string[] = [];

  // function definitions (JS/TS)
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)[^{]*\{[\s\S]*?\n\}/gm;
  let m: RegExpExecArray | null;
  while ((m = funcRegex.exec(text)) !== null) {
    defs.push(m[0]);
  }

  // class definitions
  const classRegex = /(?:export\s+)?class\s+(\w+)[\s\S]*?\n\}/gm;
  while ((m = classRegex.exec(text)) !== null) {
    defs.push(m[0]);
  }

  return defs;
}

function detectTags(text: string): string[] {
  const found = new Set<string>();
  for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        found.add(tag);
        break;
      }
    }
  }
  return [...found];
}

function computeNoveltyScore(content: string): number {
  let score = 0.3; // baseline

  // Length bonus (longer = more substantial, up to +0.15)
  const lines = content.split("\n").length;
  score += Math.min(lines / 100, 0.15);

  // Comments indicate documented/educational code (+0.1)
  const commentLines = content.split("\n").filter(
    (l) => l.trim().startsWith("//") || l.trim().startsWith("#") || l.trim().startsWith("*"),
  ).length;
  if (commentLines > 2) score += 0.1;

  // Uncommon API usage (+0.05 each, max +0.2)
  let uncommonCount = 0;
  for (const pattern of UNCOMMON_APIS) {
    if (pattern.test(content)) uncommonCount++;
  }
  score += Math.min(uncommonCount * 0.05, 0.2);

  // Solution patterns (+0.15)
  for (const pattern of SOLUTION_PATTERNS) {
    if (pattern.test(content)) {
      score += 0.15;
      break;
    }
  }

  // Multiple language tags suggest cross-cutting content (+0.1)
  const tags = detectTags(content);
  if (tags.length >= 3) score += 0.1;

  return Math.min(score, 1.0);
}

function generateTitle(content: string, type: NudgeCandidate["type"]): string {
  // Try to find a function/class name
  const funcMatch = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
  if (funcMatch) return `Function: ${funcMatch[1]}`;

  const classMatch = content.match(/(?:export\s+)?class\s+(\w+)/);
  if (classMatch) return `Class: ${classMatch[1]}`;

  // Fall back to type-based titles
  switch (type) {
    case "solution":
      return "Error Resolution Pattern";
    case "tutorial":
      return "Step-by-Step Guide";
    case "snippet":
      return "Code Snippet";
    case "pattern":
      return "Code Pattern";
  }
}

function generateDescription(content: string, type: NudgeCandidate["type"]): string {
  const lines = content.split("\n").length;
  const tags = detectTags(content);
  const tagStr = tags.length > 0 ? ` (${tags.join(", ")})` : "";

  switch (type) {
    case "solution":
      return `Error resolution pattern found — ${lines} lines${tagStr}`;
    case "tutorial":
      return `Tutorial-style content — ${lines} lines${tagStr}`;
    case "snippet":
      return `Substantial code block — ${lines} lines${tagStr}`;
    case "pattern":
      return `Reusable code definition — ${lines} lines${tagStr}`;
  }
}

// ── Main Analyzer ────────────────────────────────────────────────────

export function analyzeForNudges(text: string): NudgeCandidate[] {
  const candidates: NudgeCandidate[] = [];
  const seen = new Set<string>();

  // Check for solution patterns in the overall text
  const hasSolution = SOLUTION_PATTERNS.some((p) => p.test(text));
  const hasTutorial = TUTORIAL_PATTERNS.some((p) => p.test(text));

  // Analyze code blocks
  const codeBlocks = extractCodeBlocks(text);
  for (const block of codeBlocks) {
    const key = block.slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);

    let type: NudgeCandidate["type"] = "snippet";
    if (hasSolution) type = "solution";
    else if (hasTutorial) type = "tutorial";

    const tags = detectTags(block);
    const noveltyScore = computeNoveltyScore(block);

    candidates.push({
      type,
      title: generateTitle(block, type),
      description: generateDescription(block, type),
      content: block,
      noveltyScore,
      tags,
    });
  }

  // Analyze standalone definitions (outside code blocks)
  const textWithoutCodeBlocks = text.replace(/```[\w]*\n[\s\S]*?```/g, "");
  const definitions = extractDefinitions(textWithoutCodeBlocks);
  for (const def of definitions) {
    const key = def.slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);

    const tags = detectTags(def);
    const noveltyScore = computeNoveltyScore(def);

    candidates.push({
      type: "pattern",
      title: generateTitle(def, "pattern"),
      description: generateDescription(def, "pattern"),
      content: def,
      noveltyScore,
      tags,
    });
  }

  // Sort by novelty score descending
  candidates.sort((a, b) => b.noveltyScore - a.noveltyScore);

  return candidates;
}
