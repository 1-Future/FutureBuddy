// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync, powershell } from "../utils.js";

export class PowerToysWrapper implements ToolWrapper {
  id = "powertoys";
  name = "PowerToys";
  description = "Microsoft productivity utilities — FancyZones, PowerRename, Color Picker, Always On Top, and more.";
  domain = "system-tools" as const;
  installMethod = "winget";
  installCommand = "winget install Microsoft.PowerToys";

  async detect(): Promise<ToolStatus> {
    try {
      const wingetOut = await execAsync(
        'winget list --id Microsoft.PowerToys --accept-source-agreements 2>&1',
        15_000,
      );
      if (wingetOut.includes("Microsoft.PowerToys")) {
        const version = wingetOut.match(/PowerToys\s+([\d.]+)/)?.[1];
        return { installed: true, version };
      }
      return { installed: false };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "powertoys-launch",
        name: "Launch PowerToys",
        description: "Open the PowerToys settings window",
        tier: "green",
        params: [],
        execute: async () => this.launch(),
      },
      {
        id: "powertoys-status",
        name: "PowerToys status",
        description: "Check if PowerToys is running and list active modules",
        tier: "green",
        params: [],
        execute: async () => this.status(),
      },
      {
        id: "powertoys-install",
        name: "Install PowerToys",
        description: "Install Microsoft PowerToys via winget",
        tier: "yellow",
        params: [],
        execute: async () => this.install(),
      },
      {
        id: "powertoys-update",
        name: "Update PowerToys",
        description: "Update PowerToys to the latest version",
        tier: "yellow",
        params: [],
        execute: async () => this.update(),
      },
    ];
  }

  private async launch(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      await execAsync('start "" "PowerToys.exe"', 5_000);
      return {
        success: true,
        toolId: this.id,
        output: "PowerToys settings launched.",
        duration: Date.now() - start,
      };
    } catch {
      // Try full path
      try {
        await execAsync('start "" "%LOCALAPPDATA%\\PowerToys\\PowerToys.exe"', 5_000);
        return {
          success: true,
          toolId: this.id,
          output: "PowerToys settings launched.",
          duration: Date.now() - start,
        };
      } catch (err: any) {
        return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
      }
    }
  }

  private async status(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        "Get-Process -Name 'PowerToys*' -ErrorAction SilentlyContinue | Select-Object Name, Id, CPU, WorkingSet64 | Format-Table -AutoSize | Out-String",
        10_000,
      );
      return {
        success: true,
        toolId: this.id,
        output: output || "No PowerToys processes running.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async install(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(
        "winget install Microsoft.PowerToys --accept-package-agreements --accept-source-agreements",
        300_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async update(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(
        "winget upgrade Microsoft.PowerToys --accept-package-agreements --accept-source-agreements",
        300_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
