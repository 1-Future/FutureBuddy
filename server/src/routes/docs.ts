// Copyright 2025 #1 Future — Apache 2.0 License

import { execSync } from "node:child_process";
import type { FastifyPluginAsync } from "fastify";
import { loadConfig } from "../config.js";
import { getAIProvider } from "../modules/ai/router.js";
import {
  analyzeProject,
  generateReadmePrompt,
  generateChangelogPrompt,
} from "../modules/autodocs/generator.js";

export const docsRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();

  // POST /api/docs/analyze — analyze a project directory
  app.post<{ Body: { path: string } }>("/analyze", async (request) => {
    const { path } = request.body;
    return analyzeProject(path);
  });

  // POST /api/docs/readme — generate a README for a project
  app.post<{ Body: { path: string } }>("/readme", async (request) => {
    const { path } = request.body;
    const analysis = await analyzeProject(path);
    const prompt = generateReadmePrompt(analysis);
    const provider = getAIProvider(config.ai);
    const content = await provider.chat(
      [{ role: "user", content: prompt, timestamp: new Date().toISOString() }],
      config.ai,
    );
    return { content };
  });

  // POST /api/docs/changelog — generate a changelog from git commits
  app.post<{ Body: { path: string; since?: string } }>(
    "/changelog",
    async (request) => {
      const { path, since } = request.body;
      const sinceArg = since ? `--since="${since}"` : "--max-count=50";
      let commits: string[];
      try {
        const output = execSync(
          `git -C "${path}" log ${sinceArg} --oneline`,
          { encoding: "utf-8", timeout: 10000 },
        );
        commits = output.trim().split("\n").filter(Boolean);
      } catch {
        commits = [];
      }

      if (commits.length === 0) {
        return { content: "No commits found." };
      }

      const prompt = generateChangelogPrompt(commits);
      const provider = getAIProvider(config.ai);
      const content = await provider.chat(
        [
          {
            role: "user",
            content: prompt,
            timestamp: new Date().toISOString(),
          },
        ],
        config.ai,
      );
      return { content };
    },
  );
};
