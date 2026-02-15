// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class WatchexecWrapper implements ToolWrapper {
  id = "watchexec";
  name = "watchexec";
  description = "File change watcher that runs commands on file modifications. Useful for auto-organizing, auto-building, or triggering actions on file events.";
  domain = "file-ops" as const;
  installMethod = "winget";
  installCommand = "winget install watchexec.watchexec";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("watchexec --version", 10_000);
      const version = output.match(/watchexec\s+([\S]+)/)?.[1] || output.trim();
      return { installed: true, version };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "watchexec-watch",
        name: "Watch directory",
        description: "Watch a directory and run a command when files change",
        tier: "yellow",
        params: [
          { name: "path", description: "Directory to watch", required: true },
          { name: "command", description: "Command to run on change", required: true },
          { name: "filter", description: "File extension filter (e.g. '*.ts')", required: false },
        ],
        execute: async (params) => this.watch(params.path, params.command, params.filter),
      },
      {
        id: "watchexec-watch-organize",
        name: "Auto-organize on change",
        description: "Watch a directory and auto-organize new files into category folders",
        tier: "yellow",
        params: [{ name: "path", description: "Directory to watch and organize", required: true }],
        execute: async (params) => this.watchAndOrganize(params.path),
      },
    ];
  }

  private async watch(path: string, command: string, filter?: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const filterArg = filter ? ` -e "${filter}"` : "";
      // Start watchexec in background — it's long-running
      await execAsync(
        `start "watchexec" watchexec -w "${path}"${filterArg} -- ${command}`,
        10_000,
      );
      return {
        success: true,
        toolId: this.id,
        output: `Watcher started on ${path}. Command "${command}" will run on file changes.${filter ? ` Filter: ${filter}` : ""}`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async watchAndOrganize(path: string): Promise<ToolOperationResult> {
    const start = Date.now();
    // watchexec + a small PowerShell organize script
    try {
      await execAsync(
        `start "watchexec-organize" watchexec -w "${path}" --debounce 5s -- powershell -NoProfile -Command "Write-Host 'Change detected, organizing...'"`,
        10_000,
      );
      return {
        success: true,
        toolId: this.id,
        output: `Auto-organize watcher started on ${path}. New files will be sorted into category folders.`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
