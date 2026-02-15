// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { organizeDirectory } from "../file-organizer.js";

export class OrganizeToolWrapper implements ToolWrapper {
  id = "organize-tool";
  name = "FutureBuddy File Organizer";
  description = "Built-in extension-based file organizer. Sorts files into category folders (Documents, Images, Videos, etc.).";
  domain = "file-ops" as const;
  installMethod = "built-in";

  async detect(): Promise<ToolStatus> {
    // Always available — it's built into FutureBuddy
    return { installed: true };
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "organize-preview",
        name: "Preview file organization",
        description: "Dry-run: show what files would be moved without actually moving them",
        tier: "green",
        params: [{ name: "path", description: "Directory path to organize", required: true }],
        execute: async (params) => this.preview(params.path),
      },
      {
        id: "organize-execute",
        name: "Organize files",
        description: "Move files into category folders based on extension (Documents, Images, Videos, etc.)",
        tier: "yellow",
        params: [{ name: "path", description: "Directory path to organize", required: true }],
        execute: async (params) => this.organize(params.path),
      },
    ];
  }

  private async preview(path: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const result = await organizeDirectory(path, true);
      const lines = [
        `Preview for: ${path}`,
        `Would move: ${result.moved} files`,
        `Would skip: ${result.skipped} files (unknown extension)`,
        "",
        ...result.details.map((d) => `  ${d.from} → ${d.to}`),
      ];
      return { success: true, toolId: this.id, output: lines.join("\n"), duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async organize(path: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const result = await organizeDirectory(path, false);
      const lines = [
        `Organized: ${path}`,
        `Moved: ${result.moved} files`,
        `Skipped: ${result.skipped} files`,
        "",
        ...result.details.map((d) => `  ${d.from} → ${d.to}`),
      ];
      return { success: true, toolId: this.id, output: lines.join("\n"), duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
