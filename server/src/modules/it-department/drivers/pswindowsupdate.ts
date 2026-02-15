// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { powershell } from "../utils.js";

export class PSWindowsUpdateWrapper implements ToolWrapper {
  id = "pswindowsupdate";
  name = "PSWindowsUpdate";
  description = "PowerShell module for managing Windows Update. Check, download, and install driver updates via Windows Update.";
  domain = "drivers" as const;
  installMethod = "powershell-module";
  installCommand = "Install-Module PSWindowsUpdate -Force -Scope CurrentUser";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await powershell(
        "Get-Module -ListAvailable PSWindowsUpdate | Select-Object -ExpandProperty Version | Select-Object -First 1",
        15_000,
      );
      const version = output.trim();
      if (!version) return { installed: false };
      return { installed: true, version };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "pswu-check-drivers",
        name: "Check driver updates",
        description: "Check Windows Update for available driver updates",
        tier: "green",
        params: [],
        execute: async () => this.checkDriverUpdates(),
      },
      {
        id: "pswu-check-all",
        name: "Check all updates",
        description: "Check Windows Update for all available updates",
        tier: "green",
        params: [],
        execute: async () => this.checkAllUpdates(),
      },
      {
        id: "pswu-install-drivers",
        name: "Install driver updates",
        description: "Download and install all available driver updates from Windows Update",
        tier: "yellow",
        params: [],
        execute: async () => this.installDriverUpdates(),
      },
      {
        id: "pswu-install-all",
        name: "Install all updates",
        description: "Download and install all available Windows updates",
        tier: "yellow",
        params: [],
        execute: async () => this.installAllUpdates(),
      },
      {
        id: "pswu-history",
        name: "Update history",
        description: "Show recent Windows Update history",
        tier: "green",
        params: [{ name: "count", description: "Number of entries to show", required: false, default: "20" }],
        execute: async (params) => this.history(parseInt(params.count || "20", 10)),
      },
    ];
  }

  private async checkDriverUpdates(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        "Import-Module PSWindowsUpdate; Get-WindowsUpdate -Category Drivers -Verbose 4>&1 | Out-String",
        120_000,
      );
      return { success: true, toolId: this.id, output: output || "No driver updates available.", duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async checkAllUpdates(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        "Import-Module PSWindowsUpdate; Get-WindowsUpdate | Out-String",
        120_000,
      );
      return { success: true, toolId: this.id, output: output || "No updates available.", duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async installDriverUpdates(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        "Import-Module PSWindowsUpdate; Install-WindowsUpdate -Category Drivers -AcceptAll -AutoReboot:$false | Out-String",
        600_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async installAllUpdates(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        "Import-Module PSWindowsUpdate; Install-WindowsUpdate -AcceptAll -AutoReboot:$false | Out-String",
        600_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async history(count: number): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `Import-Module PSWindowsUpdate; Get-WUHistory -MaxDate (Get-Date) -Last ${count} | Format-Table -AutoSize | Out-String -Width 200`,
        30_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
