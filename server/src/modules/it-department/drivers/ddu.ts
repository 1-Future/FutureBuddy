// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class DDUWrapper implements ToolWrapper {
  id = "ddu";
  name = "Display Driver Uninstaller";
  description = "Completely removes GPU drivers (NVIDIA, AMD, Intel) for clean reinstallation. Best used in Safe Mode.";
  domain = "drivers" as const;
  installMethod = "portable";
  installCommand = "winget install Wagnardsoft.DisplayDriverUninstaller";

  async detect(): Promise<ToolStatus> {
    try {
      // DDU is a portable app — check common locations
      const paths = [
        "C:\\tools\\DDU\\Display Driver Uninstaller.exe",
        "C:\\tools\\ddu\\DDU.exe",
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

      // Try winget to see if installed
      const wingetOut = await execAsync(
        'winget list --id Wagnardsoft.DisplayDriverUninstaller --accept-source-agreements 2>&1',
        15_000,
      );
      if (wingetOut.includes("Wagnardsoft")) {
        return { installed: true };
      }

      return { installed: false };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "ddu-clean-nvidia",
        name: "Clean uninstall NVIDIA drivers",
        description: "Completely remove NVIDIA GPU drivers. Recommend running in Safe Mode for best results.",
        tier: "red",
        params: [],
        execute: async () => this.cleanUninstall("nvidia"),
      },
      {
        id: "ddu-clean-amd",
        name: "Clean uninstall AMD drivers",
        description: "Completely remove AMD GPU drivers. Recommend running in Safe Mode for best results.",
        tier: "red",
        params: [],
        execute: async () => this.cleanUninstall("amd"),
      },
      {
        id: "ddu-clean-intel",
        name: "Clean uninstall Intel GPU drivers",
        description: "Completely remove Intel GPU drivers. Recommend running in Safe Mode for best results.",
        tier: "red",
        params: [],
        execute: async () => this.cleanUninstall("intel"),
      },
      {
        id: "ddu-launch",
        name: "Launch DDU",
        description: "Open Display Driver Uninstaller GUI for manual driver cleanup",
        tier: "yellow",
        params: [],
        execute: async () => this.launch(),
      },
    ];
  }

  private async cleanUninstall(gpu: "nvidia" | "amd" | "intel"): Promise<ToolOperationResult> {
    const start = Date.now();
    // DDU is fundamentally a GUI app with limited CLI support.
    // We launch it and inform the user.
    try {
      await execAsync('start "" "Display Driver Uninstaller.exe"', 5_000);
      return {
        success: true,
        toolId: this.id,
        output: `DDU launched. Please select "${gpu.toUpperCase()}" in the dropdown and click "Clean and restart" for a full driver removal. For best results, run DDU in Safe Mode.`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        toolId: this.id,
        error: `Could not launch DDU: ${err.message}. You may need to navigate to the DDU folder and run it manually.`,
        duration: Date.now() - start,
      };
    }
  }

  private async launch(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      await execAsync('start "" "Display Driver Uninstaller.exe"', 5_000);
      return {
        success: true,
        toolId: this.id,
        output: "Display Driver Uninstaller launched.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
