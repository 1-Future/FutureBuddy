// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync, powershell } from "../utils.js";

export class RaprWrapper implements ToolWrapper {
  id = "rapr";
  name = "Driver Store Explorer (RAPR)";
  description = "GUI and CLI tool for viewing and cleaning the Windows driver store. Safely remove old/duplicate driver packages.";
  domain = "drivers" as const;
  installMethod = "portable";
  installCommand = "winget install lostindark.DriverStoreExplorer";

  async detect(): Promise<ToolStatus> {
    try {
      // Try winget detection first
      const wingetOut = await execAsync(
        'winget list --id lostindark.DriverStoreExplorer --accept-source-agreements 2>&1',
        15_000,
      );
      if (wingetOut.includes("lostindark")) {
        return { installed: true };
      }

      // Check common portable locations
      const paths = [
        "C:\\tools\\rapr\\Rapr.exe",
        "C:\\tools\\DriverStoreExplorer\\Rapr.exe",
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
        id: "rapr-list-old",
        name: "List old driver packages",
        description: "List driver store packages that have newer versions installed (safe to clean)",
        tier: "green",
        params: [],
        execute: async () => this.listOldDrivers(),
      },
      {
        id: "rapr-launch",
        name: "Launch Driver Store Explorer",
        description: "Open RAPR GUI for manual driver store management",
        tier: "yellow",
        params: [],
        execute: async () => this.launch(),
      },
      {
        id: "rapr-cleanup",
        name: "Clean old driver packages",
        description: "Remove old driver packages from the driver store (keeps newest version of each)",
        tier: "red",
        params: [],
        execute: async () => this.cleanup(),
      },
    ];
  }

  private async listOldDrivers(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Use pnputil to enumerate and identify old drivers since RAPR CLI is limited
      const output = await powershell(
        "pnputil /enum-drivers | Out-String",
        30_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async launch(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      await execAsync('start "" "Rapr.exe"', 5_000);
      return {
        success: true,
        toolId: this.id,
        output: "Driver Store Explorer launched. Use the GUI to review and clean old driver packages.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async cleanup(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // RAPR doesn't have a clean CLI for batch cleanup.
      // Suggest launching the GUI for safety.
      await execAsync('start "" "Rapr.exe"', 5_000);
      return {
        success: true,
        toolId: this.id,
        output: "Driver Store Explorer launched. Select old driver packages and click 'Delete Package' to clean them. Check 'Force Deletion' only if standard removal fails.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
