// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class TagSpacesWrapper implements ToolWrapper {
  id = "tagspaces";
  name = "TagSpaces";
  description = "File tagging and organization app. Tag files with metadata, browse by tags, and manage file collections.";
  domain = "file-ops" as const;
  installMethod = "winget";
  installCommand = "winget install TagSpaces.TagSpaces";

  async detect(): Promise<ToolStatus> {
    try {
      // TagSpaces is an Electron app — check common install locations
      const wingetOut = await execAsync(
        'winget list --id TagSpaces.TagSpaces --accept-source-agreements 2>&1',
        15_000,
      );
      if (wingetOut.includes("TagSpaces")) {
        return { installed: true };
      }

      const paths = [
        "C:\\Program Files\\TagSpaces\\TagSpaces.exe",
        "%LOCALAPPDATA%\\Programs\\TagSpaces\\TagSpaces.exe",
      ];

      for (const path of paths) {
        try {
          const result = await execAsync(`cmd /c if exist "${path}" echo found`, 5_000);
          if (result.includes("found")) {
            return { installed: true, path };
          }
        } catch {
          continue;
        }
      }

      return { installed: false };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "tagspaces-launch",
        name: "Launch TagSpaces",
        description: "Open TagSpaces for visual file tagging and browsing",
        tier: "green",
        params: [{ name: "path", description: "Directory to open in TagSpaces", required: false }],
        execute: async (params) => this.launch(params.path),
      },
      {
        id: "tagspaces-tag-files",
        name: "Tag files by extension",
        description: "Add sidecar tags to files in a directory based on their extension type",
        tier: "yellow",
        params: [
          { name: "path", description: "Directory containing files to tag", required: true },
          { name: "tag", description: "Tag to apply", required: true },
        ],
        execute: async (params) => this.tagByExtension(params.path, params.tag),
      },
    ];
  }

  private async launch(path?: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const pathArg = path ? ` "${path}"` : "";
      await execAsync(`start "" "TagSpaces.exe"${pathArg}`, 5_000);
      return {
        success: true,
        toolId: this.id,
        output: `TagSpaces launched.${path ? ` Opened: ${path}` : ""}`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async tagByExtension(path: string, tag: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // TagSpaces uses filename-based tagging: file[tag1 tag2].ext
      // We can also create .ts sidecar JSON files for non-destructive tagging
      const output = await execAsync(
        `powershell -NoProfile -Command "Get-ChildItem -Path '${path}' -File | ForEach-Object { $sidecar = Join-Path $_.DirectoryName ('.ts' + $_.Name + '.json'); if (-not (Test-Path $sidecar)) { @{tags=@('${tag}')} | ConvertTo-Json | Set-Content -Path $sidecar -Encoding UTF8; Write-Output ('Tagged: ' + $_.Name) } else { Write-Output ('Already tagged: ' + $_.Name) } }"`,
        30_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
