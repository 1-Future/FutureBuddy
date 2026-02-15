// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class BCUninstallerWrapper implements ToolWrapper {
  id = "bcuninstaller";
  name = "Bulk Crap Uninstaller";
  description = "Advanced program removal tool. Detects leftovers, supports silent batch uninstall, and handles stubborn programs.";
  domain = "debloat" as const;
  installMethod = "winget";
  installCommand = "winget install Klocman.BulkCrapUninstaller";

  async detect(): Promise<ToolStatus> {
    try {
      // Check winget installation
      const wingetOut = await execAsync(
        'winget list --id Klocman.BulkCrapUninstaller --accept-source-agreements 2>&1',
        15_000,
      );
      if (wingetOut.includes("Klocman")) {
        return { installed: true };
      }

      // Check common paths
      const paths = [
        "C:\\Program Files\\BCUninstaller\\BCUninstaller.exe",
        "%LOCALAPPDATA%\\Programs\\BCUninstaller\\BCUninstaller.exe",
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
        id: "bcu-list",
        name: "List all programs",
        description: "List all installed programs detected by BCUninstaller",
        tier: "green",
        params: [],
        execute: async () => this.listPrograms(),
      },
      {
        id: "bcu-launch",
        name: "Launch BCUninstaller",
        description: "Open the BCUninstaller GUI for manual batch uninstall",
        tier: "yellow",
        params: [],
        execute: async () => this.launch(),
      },
      {
        id: "bcu-uninstall",
        name: "Uninstall program",
        description: "Uninstall a specific program via BCUninstaller CLI",
        tier: "red",
        params: [{ name: "name", description: "Program name (or partial match)", required: true }],
        execute: async (params) => this.uninstall(params.name),
      },
      {
        id: "bcu-uninstall-quiet",
        name: "Silent batch uninstall",
        description: "Silently uninstall one or more programs by name",
        tier: "red",
        params: [{ name: "names", description: "Comma-separated program names to uninstall", required: true }],
        execute: async (params) => this.batchUninstall(params.names),
      },
    ];
  }

  private async listPrograms(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("BCUninstaller.exe /export list.txt && type list.txt", 60_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch {
      // Fall back to PowerShell WMI listing
      try {
        const psOutput = await execAsync(
          'powershell -NoProfile -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher | Sort-Object DisplayName | Format-Table -AutoSize | Out-String -Width 200"',
          30_000,
        );
        return {
          success: true,
          toolId: this.id,
          output: psOutput,
          duration: Date.now() - start,
        };
      } catch (err: any) {
        return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
      }
    }
  }

  private async launch(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      await execAsync('start "" "BCUninstaller.exe"', 5_000);
      return {
        success: true,
        toolId: this.id,
        output: "Bulk Crap Uninstaller launched. Select programs to remove and use batch uninstall.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async uninstall(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`BCUninstaller.exe /uninstall "${name}"`, 120_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async batchUninstall(names: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // BCUninstaller supports passing multiple names
      const nameList = names.split(",").map((n) => `"${n.trim()}"`).join(" ");
      const output = await execAsync(`BCUninstaller.exe /uninstall ${nameList} /quiet`, 300_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
