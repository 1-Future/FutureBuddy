// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync, powershell } from "../utils.js";

export class Win11DebloatWrapper implements ToolWrapper {
  id = "win11debloat";
  name = "Win11Debloat";
  description = "Focused PowerShell debloater for Windows 11. Removes bloatware apps, disables telemetry, and cleans up the Start menu.";
  domain = "debloat" as const;
  installMethod = "git-clone";
  installCommand = "git clone https://github.com/Raphire/Win11Debloat.git C:\\tools\\Win11Debloat";

  async detect(): Promise<ToolStatus> {
    try {
      const paths = [
        "C:\\tools\\Win11Debloat\\Win11Debloat.ps1",
        "%USERPROFILE%\\Win11Debloat\\Win11Debloat.ps1",
      ];

      for (const path of paths) {
        try {
          const expanded = await execAsync(`cmd /c if exist "${path}" echo found`, 5_000);
          if (expanded.includes("found")) {
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
        id: "win11debloat-default",
        name: "Run default debloat",
        description: "Remove default bloatware apps and apply recommended settings",
        tier: "red",
        params: [],
        execute: async () => this.runDefault(),
      },
      {
        id: "win11debloat-apps-only",
        name: "Remove bloatware apps only",
        description: "Remove pre-installed bloatware apps without changing system settings",
        tier: "red",
        params: [],
        execute: async () => this.removeAppsOnly(),
      },
      {
        id: "win11debloat-disable-telemetry",
        name: "Disable telemetry",
        description: "Disable Windows telemetry and data collection",
        tier: "red",
        params: [],
        execute: async () => this.disableTelemetry(),
      },
      {
        id: "win11debloat-disable-bing",
        name: "Disable Bing in Start menu",
        description: "Remove Bing web search results from the Windows Start menu",
        tier: "yellow",
        params: [],
        execute: async () => this.disableBing(),
      },
      {
        id: "win11debloat-restore-taskbar",
        name: "Clean up taskbar",
        description: "Remove Widgets, Chat, and Task View from the taskbar",
        tier: "yellow",
        params: [],
        execute: async () => this.cleanTaskbar(),
      },
    ];
  }

  private scriptPath(): string {
    return "C:\\tools\\Win11Debloat\\Win11Debloat.ps1";
  }

  private async runDefault(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `& '${this.scriptPath()}' -Silent -RemoveApps -DisableTelemetry -DisableBing -DisableSuggestions -DisableLockscreenTips -RevertContextMenu`,
        300_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async removeAppsOnly(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `& '${this.scriptPath()}' -Silent -RemoveApps`,
        300_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async disableTelemetry(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `& '${this.scriptPath()}' -Silent -DisableTelemetry`,
        120_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async disableBing(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `& '${this.scriptPath()}' -Silent -DisableBing`,
        60_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async cleanTaskbar(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `& '${this.scriptPath()}' -Silent -HideWidgets -HideChat -HideTaskview`,
        60_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
