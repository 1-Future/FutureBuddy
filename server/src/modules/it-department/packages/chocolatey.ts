// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class ChocolateyWrapper implements ToolWrapper {
  id = "chocolatey";
  name = "Chocolatey";
  description = "Enterprise-grade Windows package manager. Requires admin for most operations.";
  domain = "packages" as const;
  installMethod = "script";
  installCommand = "winget install Chocolatey.Chocolatey";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("choco --version", 10_000);
      return { installed: true, version: output.trim() };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "choco-search",
        name: "Search packages",
        description: "Search Chocolatey community repository",
        tier: "green",
        params: [{ name: "query", description: "Package name or keyword", required: true }],
        execute: async (params) => this.search(params.query),
      },
      {
        id: "choco-list",
        name: "List installed",
        description: "List all Chocolatey-installed packages",
        tier: "green",
        params: [],
        execute: async () => this.list(),
      },
      {
        id: "choco-install",
        name: "Install package",
        description: "Install a package via Chocolatey (may require admin)",
        tier: "yellow",
        params: [{ name: "name", description: "Package name (e.g. firefox, vscode)", required: true }],
        execute: async (params) => this.install(params.name),
      },
      {
        id: "choco-upgrade",
        name: "Upgrade packages",
        description: "Upgrade a specific package or all packages",
        tier: "yellow",
        params: [{ name: "name", description: "Package name, or 'all' for everything", required: false, default: "all" }],
        execute: async (params) => this.upgrade(params.name || "all"),
      },
      {
        id: "choco-uninstall",
        name: "Uninstall package",
        description: "Remove a Chocolatey-installed package",
        tier: "red",
        params: [{ name: "name", description: "Package name to remove", required: true }],
        execute: async (params) => this.uninstall(params.name),
      },
    ];
  }

  private async search(query: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`choco search ${query}`, 30_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async list(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("choco list", 15_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async install(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`choco install ${name} -y`, 300_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async upgrade(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`choco upgrade ${name} -y`, 300_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async uninstall(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`choco uninstall ${name} -y`, 120_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
