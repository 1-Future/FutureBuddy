// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class AIFilesWrapper implements ToolWrapper {
  id = "aifiles";
  name = "AI Files";
  description = "AI-powered file organizer using local LLMs (Ollama). Understands file content and names to create smart folder structures.";
  domain = "file-ops" as const;
  installMethod = "pip";
  installCommand = "pip install aifiles";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("aifiles --version 2>&1", 10_000);
      return { installed: true, version: output.trim() };
    } catch {
      // Also check via pip
      try {
        const pipOut = await execAsync("pip show aifiles 2>&1", 10_000);
        if (pipOut.includes("Version:")) {
          const version = pipOut.match(/Version:\s*([\S]+)/)?.[1];
          return { installed: true, version };
        }
      } catch {
        // Not installed
      }
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "aifiles-organize",
        name: "AI organize files",
        description: "Use AI to analyze file names and organize them into smart folder structures",
        tier: "yellow",
        params: [
          { name: "path", description: "Directory to organize", required: true },
          { name: "destination", description: "Destination directory (defaults to same as source)", required: false },
        ],
        execute: async (params) => this.organize(params.path, params.destination),
      },
      {
        id: "aifiles-preview",
        name: "AI organize preview",
        description: "Preview what the AI would do without moving files",
        tier: "green",
        params: [{ name: "path", description: "Directory to preview", required: true }],
        execute: async (params) => this.preview(params.path),
      },
    ];
  }

  private async organize(path: string, destination?: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const dest = destination ? ` --dest "${destination}"` : "";
      const output = await execAsync(`aifiles organize "${path}"${dest}`, 300_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async preview(path: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`aifiles organize "${path}" --dry-run`, 120_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
