// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class WingetWrapper implements ToolWrapper {
  id = "winget";
  name = "winget";
  description = "Windows Package Manager (built-in). Install, update, and manage software.";
  domain = "packages" as const;
  installMethod = "built-in";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("winget --version", 10_000);
      return { installed: true, version: output.trim() };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "winget-search",
        name: "Search packages",
        description: "Search for available packages",
        tier: "green",
        params: [{ name: "query", description: "Package name or keyword", required: true }],
        execute: async (params) => this.search(params.query),
      },
      {
        id: "winget-list",
        name: "List installed",
        description: "List all installed packages",
        tier: "green",
        params: [],
        execute: async () => this.list(),
      },
      {
        id: "winget-install",
        name: "Install package",
        description: "Install a package by ID",
        tier: "yellow",
        params: [{ name: "id", description: "Package ID (e.g. Mozilla.Firefox)", required: true }],
        execute: async (params) => this.install(params.id),
      },
      {
        id: "winget-upgrade",
        name: "Upgrade package",
        description: "Upgrade a specific package or all packages",
        tier: "yellow",
        params: [{ name: "id", description: "Package ID, or 'all' for everything", required: false, default: "all" }],
        execute: async (params) => this.upgrade(params.id || "all"),
      },
      {
        id: "winget-uninstall",
        name: "Uninstall package",
        description: "Remove an installed package",
        tier: "red",
        params: [{ name: "id", description: "Package ID to remove", required: true }],
        execute: async (params) => this.uninstall(params.id),
      },
    ];
  }

  private async search(query: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`winget search "${query}" --accept-source-agreements`, 30_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async list(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("winget list --accept-source-agreements", 60_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async install(id: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(
        `winget install "${id}" --accept-package-agreements --accept-source-agreements`,
        300_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async upgrade(id: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const cmd = id === "all"
        ? "winget upgrade --all --accept-package-agreements --accept-source-agreements"
        : `winget upgrade "${id}" --accept-package-agreements --accept-source-agreements`;
      const output = await execAsync(cmd, 300_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async uninstall(id: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`winget uninstall "${id}"`, 120_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
