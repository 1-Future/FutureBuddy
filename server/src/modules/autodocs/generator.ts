// Copyright 2025 #1 Future — Apache 2.0 License

import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, basename, relative } from "node:path";

export interface ProjectAnalysis {
  name: string;
  rootPath: string;
  files: { path: string; type: string; size: number }[];
  languages: Record<string, number>;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasDockerfile: boolean;
  hasGit: boolean;
  packageInfo?: {
    name: string;
    version: string;
    description: string;
    dependencies: string[];
  };
  structure: string;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "__pycache__",
  ".next",
  ".nuxt",
  "build",
  ".cache",
  ".turbo",
]);

const MAX_DEPTH = 3;
const MAX_ENTRIES = 100;

async function walkDirectory(
  dirPath: string,
  rootPath: string,
  files: { path: string; type: string; size: number }[],
  depth: number,
): Promise<void> {
  if (depth > MAX_DEPTH || files.length >= MAX_ENTRIES) return;

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= MAX_ENTRIES) break;

    const fullPath = join(dirPath, entry);
    let entryStat;
    try {
      entryStat = await stat(fullPath);
    } catch {
      continue;
    }

    if (entryStat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      await walkDirectory(fullPath, rootPath, files, depth + 1);
    } else {
      const relPath = relative(rootPath, fullPath);
      const ext = extname(entry).toLowerCase();
      files.push({
        path: relPath,
        type: ext || "unknown",
        size: entryStat.size,
      });
    }
  }
}

function buildStructureTree(
  files: { path: string; type: string; size: number }[],
): string {
  const lines: string[] = [];
  const dirs = new Set<string>();

  // Collect unique directory paths and sort entries
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split(/[\\/]/);
    // Add all parent directories
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }

  // Build a simple tree representation
  const allEntries = new Set<string>();
  for (const dir of dirs) allEntries.add(dir + "/");
  for (const file of sortedFiles) allEntries.add(file.path);

  const sorted = [...allEntries].sort();
  for (const entry of sorted) {
    const depth = entry.split(/[\\/]/).length - 1;
    const indent = "  ".repeat(depth);
    const name = entry.endsWith("/")
      ? basename(entry.slice(0, -1)) + "/"
      : basename(entry);
    lines.push(`${indent}${name}`);
  }

  return lines.join("\n");
}

export async function analyzeProject(
  rootPath: string,
): Promise<ProjectAnalysis> {
  const files: { path: string; type: string; size: number }[] = [];
  await walkDirectory(rootPath, rootPath, files, 0);

  // Count languages by extension
  const languages: Record<string, number> = {};
  for (const file of files) {
    if (file.type && file.type !== "unknown") {
      languages[file.type] = (languages[file.type] || 0) + 1;
    }
  }

  // Check for key files
  let hasPackageJson = false;
  let hasTsConfig = false;
  let hasDockerfile = false;
  let hasGit = false;

  try {
    await stat(join(rootPath, "package.json"));
    hasPackageJson = true;
  } catch {
    // Not found
  }

  try {
    await stat(join(rootPath, "tsconfig.json"));
    hasTsConfig = true;
  } catch {
    // Not found
  }

  try {
    await stat(join(rootPath, "Dockerfile"));
    hasDockerfile = true;
  } catch {
    // Not found
  }

  try {
    await stat(join(rootPath, ".git"));
    hasGit = true;
  } catch {
    // Not found
  }

  // Read package.json if it exists
  let packageInfo: ProjectAnalysis["packageInfo"];
  if (hasPackageJson) {
    try {
      const raw = await readFile(join(rootPath, "package.json"), "utf-8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      packageInfo = {
        name: (pkg.name as string) || "",
        version: (pkg.version as string) || "",
        description: (pkg.description as string) || "",
        dependencies: [
          ...Object.keys((pkg.dependencies as Record<string, string>) || {}),
          ...Object.keys(
            (pkg.devDependencies as Record<string, string>) || {},
          ),
        ],
      };
    } catch {
      // Could not parse package.json
    }
  }

  const structure = buildStructureTree(files);
  const name = packageInfo?.name || basename(rootPath);

  return {
    name,
    rootPath,
    files,
    languages,
    hasPackageJson,
    hasTsConfig,
    hasDockerfile,
    hasGit,
    packageInfo,
    structure,
  };
}

export function generateReadmePrompt(analysis: ProjectAnalysis): string {
  const languageList = Object.entries(analysis.languages)
    .sort(([, a], [, b]) => b - a)
    .map(([ext, count]) => `${ext}: ${count} files`)
    .join(", ");

  const configFiles: string[] = [];
  if (analysis.hasPackageJson) configFiles.push("package.json");
  if (analysis.hasTsConfig) configFiles.push("tsconfig.json");
  if (analysis.hasDockerfile) configFiles.push("Dockerfile");
  if (analysis.hasGit) configFiles.push(".git");

  let prompt = `Generate a comprehensive README.md in Markdown format for the following project.

## Project Analysis

**Name:** ${analysis.name}
**Languages:** ${languageList || "Unknown"}
**Config files found:** ${configFiles.join(", ") || "None"}
**Total files analyzed:** ${analysis.files.length}
`;

  if (analysis.packageInfo) {
    prompt += `
**Package name:** ${analysis.packageInfo.name}
**Version:** ${analysis.packageInfo.version}
**Description:** ${analysis.packageInfo.description}
**Dependencies:** ${analysis.packageInfo.dependencies.join(", ") || "None"}
`;
  }

  prompt += `
## Project Structure

\`\`\`
${analysis.structure}
\`\`\`

## Instructions

Generate a README.md that includes the following sections:

1. **Project Name** — as a top-level heading
2. **Description** — a clear, concise explanation of what this project does based on the analysis
3. **Features** — key features inferred from the codebase structure and dependencies
4. **Installation** — step-by-step setup instructions based on the detected package manager and config files
5. **Usage** — how to run and use the project based on detected scripts and entry points
6. **Architecture Overview** — a brief explanation of the project structure and how components fit together
7. **License** — include a license section if one can be inferred

Output ONLY the raw Markdown content. Do not wrap it in a code block. Do not include any preamble or explanation outside the README itself.`;

  return prompt;
}

export function generateChangelogPrompt(commits: string[]): string {
  const commitList = commits.map((c) => `- ${c}`).join("\n");

  return `Generate a clean, well-organized CHANGELOG entry in Markdown format from the following git commits.

## Commits

${commitList}

## Instructions

Group the commits into the following categories (omit any category with no matching commits):

- **Features** — new functionality or capabilities
- **Fixes** — bug fixes and corrections
- **Improvements** — enhancements to existing features, refactoring, performance
- **Documentation** — docs, comments, README changes
- **Chores** — build, CI, dependency updates, tooling

For each entry, write a short human-readable description. Strip commit hashes from the output.

Use this format:

## [Unreleased]

### Features
- Description of feature

### Fixes
- Description of fix

(etc.)

Output ONLY the raw Markdown content. Do not wrap it in a code block. Do not include any preamble or explanation outside the changelog itself.`;
}
