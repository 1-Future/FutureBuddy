// Copyright 2025 #1 Future — Apache 2.0 License

export type BookmarkCategory =
  | "docs"
  | "tools"
  | "learning"
  | "reference"
  | "social"
  | "news"
  | "code"
  | "other";

interface CategoryRule {
  category: BookmarkCategory;
  domains: RegExp[];
  paths?: RegExp[];
}

/**
 * Rules are evaluated in order. More specific rules (like "code" for
 * github blob URLs) should come before broader ones (like "tools" for github.com).
 */
const RULES: CategoryRule[] = [
  // Code — specific path patterns (must be before tools)
  {
    category: "code",
    domains: [/^gist\.github\.com$/, /^codepen\.io$/, /^jsfiddle\.net$/, /^codesandbox\.io$/, /^repl\.it$/, /^stackblitz\.com$/],
  },
  {
    category: "code",
    domains: [/^github\.com$/],
    paths: [/\/blob\//, /\/tree\//, /\/commit\//, /\/pull\/\d+\/files/],
  },

  // Docs
  {
    category: "docs",
    domains: [
      /^developer\.mozilla\.org$/,
      /^docs\./,
      /\.readthedocs\.io$/,
      /^wiki\./,
      /^devdocs\.io$/,
      /^nodejs\.org\/.*\/docs/,
      /^reactjs\.org$/,
      /^react\.dev$/,
      /^vuejs\.org$/,
      /^angular\.io\/docs/,
      /^typescriptlang\.org$/,
      /^fastify\.dev$/,
      /^vitejs\.dev$/,
      /^tailwindcss\.com\/docs/,
    ],
  },

  // Learning
  {
    category: "learning",
    domains: [
      /^(www\.)?youtube\.com$/,
      /^youtu\.be$/,
      /^(www\.)?udemy\.com$/,
      /^(www\.)?coursera\.org$/,
      /^(www\.)?edx\.org$/,
      /^(www\.)?khanacademy\.org$/,
      /^stackoverflow\.com$/,
      /^stackexchange\.com$/,
      /^(www\.)?freecodecamp\.org$/,
      /^(www\.)?codecademy\.com$/,
      /^medium\.com$/,
      /^dev\.to$/,
      /^egghead\.io$/,
      /^frontendmasters\.com$/,
      /^pluralsight\.com$/,
    ],
  },

  // Reference
  {
    category: "reference",
    domains: [
      /^en\.wikipedia\.org$/,
      /^(www\.)?w3\.org$/,
      /^(www\.)?ietf\.org$/,
      /^(www\.)?rfc-editor\.org$/,
      /^json-schema\.org$/,
      /^schema\.org$/,
      /^caniuse\.com$/,
    ],
  },

  // Social
  {
    category: "social",
    domains: [
      /^(www\.)?twitter\.com$/,
      /^(www\.)?x\.com$/,
      /^(www\.)?reddit\.com$/,
      /^(www\.)?discord\.com$/,
      /^(www\.)?discord\.gg$/,
      /^(www\.)?mastodon\./,
      /^(www\.)?threads\.net$/,
      /^(www\.)?linkedin\.com$/,
      /^(www\.)?facebook\.com$/,
    ],
  },

  // News
  {
    category: "news",
    domains: [
      /^news\.ycombinator\.com$/,
      /^(www\.)?techcrunch\.com$/,
      /^(www\.)?theverge\.com$/,
      /^(www\.)?arstechnica\.com$/,
      /^(www\.)?wired\.com$/,
      /^(www\.)?engadget\.com$/,
      /^(www\.)?slashdot\.org$/,
      /^(www\.)?bleepingcomputer\.com$/,
      /^(www\.)?tomshardware\.com$/,
    ],
  },

  // Tools (broader — github.com without specific paths, npm, etc.)
  {
    category: "tools",
    domains: [
      /^github\.com$/,
      /^gitlab\.com$/,
      /^(www\.)?npmjs\.com$/,
      /^(www\.)?pypi\.org$/,
      /^hub\.docker\.com$/,
      /^(www\.)?vercel\.com$/,
      /^(www\.)?netlify\.com$/,
      /^(www\.)?cloudflare\.com$/,
      /^(www\.)?heroku\.com$/,
      /^registry\.npmjs\.org$/,
      /^crates\.io$/,
      /^pkg\.go\.dev$/,
    ],
  },
];

/**
 * Auto-categorize a URL by domain and path pattern matching.
 * Returns "other" if no rule matches.
 */
export function categorizeUrl(url: string): BookmarkCategory {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "other";
  }

  const hostname = parsed.hostname;
  const pathname = parsed.pathname;

  for (const rule of RULES) {
    const domainMatch = rule.domains.some((re) => re.test(hostname));
    if (!domainMatch) continue;

    // If the rule has path constraints, check them too
    if (rule.paths) {
      const pathMatch = rule.paths.some((re) => re.test(pathname));
      if (pathMatch) return rule.category;
      // Domain matched but path didn't — continue to next rule
      continue;
    }

    return rule.category;
  }

  // Check if the URL path itself contains docs-like patterns
  if (/\/docs?\b/i.test(pathname) || /\/api\b/i.test(pathname) || /\/reference\b/i.test(pathname)) {
    return "docs";
  }

  return "other";
}
