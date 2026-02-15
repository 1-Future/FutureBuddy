// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class ChezmoiWrapper implements ToolWrapper {
  id = "chezmoi";
  name = "chezmoi";
  description = "Dotfile manager. Sync config files across machines with Git, templates, and encryption support.";
  domain = "system-tools" as const;
  installMethod = "winget";
  installCommand = "winget install twpayne.chezmoi";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("chezmoi --version", 10_000);
      const version = output.match(/chezmoi version v?([\S]+)/)?.[1] || output.trim();
      return { installed: true, version };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "chezmoi-status",
        name: "Dotfile status",
        description: "Show which managed dotfiles have changed since last apply",
        tier: "green",
        params: [],
        execute: async () => this.status(),
      },
      {
        id: "chezmoi-managed",
        name: "List managed files",
        description: "List all files managed by chezmoi",
        tier: "green",
        params: [],
        execute: async () => this.managed(),
      },
      {
        id: "chezmoi-diff",
        name: "Show dotfile diff",
        description: "Show what would change if you applied the latest dotfiles",
        tier: "green",
        params: [],
        execute: async () => this.diff(),
      },
      {
        id: "chezmoi-apply",
        name: "Apply dotfiles",
        description: "Apply managed dotfiles to the home directory",
        tier: "yellow",
        params: [],
        execute: async () => this.apply(),
      },
      {
        id: "chezmoi-add",
        name: "Add file to dotfiles",
        description: "Add a file to chezmoi management",
        tier: "yellow",
        params: [{ name: "path", description: "File path to add (e.g. ~/.gitconfig)", required: true }],
        execute: async (params) => this.add(params.path),
      },
      {
        id: "chezmoi-update",
        name: "Pull and apply dotfiles",
        description: "Pull latest dotfiles from remote repo and apply them",
        tier: "yellow",
        params: [],
        execute: async () => this.update(),
      },
      {
        id: "chezmoi-init",
        name: "Initialize chezmoi",
        description: "Initialize chezmoi with a dotfiles repo",
        tier: "yellow",
        params: [{ name: "repo", description: "Git repo URL (e.g. github.com/user/dotfiles)", required: true }],
        execute: async (params) => this.init(params.repo),
      },
    ];
  }

  private async status(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("chezmoi status", 15_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "All managed files are up to date.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async managed(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("chezmoi managed", 15_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "No files managed by chezmoi yet.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async diff(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("chezmoi diff", 15_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "No differences. Dotfiles are in sync.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async apply(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("chezmoi apply --force", 30_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "Dotfiles applied successfully.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async add(path: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`chezmoi add "${path}"`, 15_000);
      return {
        success: true,
        toolId: this.id,
        output: output || `Added ${path} to chezmoi management.`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async update(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("chezmoi update --force", 60_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "Dotfiles pulled and applied.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async init(repo: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`chezmoi init "${repo}"`, 60_000);
      return {
        success: true,
        toolId: this.id,
        output: output || `chezmoi initialized with ${repo}. Run 'chezmoi apply' to apply dotfiles.`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
