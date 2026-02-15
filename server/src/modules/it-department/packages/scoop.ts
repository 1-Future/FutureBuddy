// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class ScoopWrapper implements ToolWrapper {
  id = "scoop";
  name = "Scoop";
  description = "Developer-friendly package manager. Installs to ~/scoop, no admin needed.";
  domain = "packages" as const;
  installMethod = "script";
  installCommand = "irm get.scoop.sh | iex";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("scoop --version", 10_000);
      // Scoop outputs version info, grab the first line
      const version = output.split("\n")[0]?.trim();
      return { installed: true, version };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "scoop-search",
        name: "Search packages",
        description: "Search Scoop buckets for packages",
        tier: "green",
        params: [{ name: "query", description: "Package name or keyword", required: true }],
        execute: async (params) => this.search(params.query),
      },
      {
        id: "scoop-list",
        name: "List installed",
        description: "List all Scoop-installed packages",
        tier: "green",
        params: [],
        execute: async () => this.list(),
      },
      {
        id: "scoop-install",
        name: "Install package",
        description: "Install a package via Scoop",
        tier: "yellow",
        params: [{ name: "name", description: "Package name (e.g. git, nodejs)", required: true }],
        execute: async (params) => this.install(params.name),
      },
      {
        id: "scoop-update",
        name: "Update packages",
        description: "Update a specific package or all packages",
        tier: "yellow",
        params: [{ name: "name", description: "Package name, or '*' for all", required: false, default: "*" }],
        execute: async (params) => this.update(params.name || "*"),
      },
      {
        id: "scoop-uninstall",
        name: "Uninstall package",
        description: "Remove a Scoop-installed package",
        tier: "red",
        params: [{ name: "name", description: "Package name to remove", required: true }],
        execute: async (params) => this.uninstall(params.name),
      },
      {
        id: "scoop-bucket-add",
        name: "Add bucket",
        description: "Add a Scoop bucket (extras, versions, etc.)",
        tier: "yellow",
        params: [{ name: "bucket", description: "Bucket name (e.g. extras, versions, java)", required: true }],
        execute: async (params) => this.addBucket(params.bucket),
      },
    ];
  }

  private async search(query: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`scoop search ${query}`, 30_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async list(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("scoop list", 15_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async install(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`scoop install ${name}`, 300_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async update(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`scoop update ${name}`, 300_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async uninstall(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`scoop uninstall ${name}`, 120_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async addBucket(bucket: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`scoop bucket add ${bucket}`, 60_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
