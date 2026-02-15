// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { powershell } from "../utils.js";

export class RemoveWindowsAIWrapper implements ToolWrapper {
  id = "remove-windows-ai";
  name = "Remove Windows AI";
  description = "Strip Copilot, Recall, and other Windows AI features via PowerShell. No external tool needed.";
  domain = "debloat" as const;
  installMethod = "built-in";

  async detect(): Promise<ToolStatus> {
    // This is pure PowerShell — always available on Windows
    try {
      await powershell("$PSVersionTable.PSVersion.Major", 5_000);
      return { installed: true };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "rwai-check-copilot",
        name: "Check Copilot status",
        description: "Check if Windows Copilot is installed and active",
        tier: "green",
        params: [],
        execute: async () => this.checkCopilot(),
      },
      {
        id: "rwai-disable-copilot",
        name: "Disable Copilot",
        description: "Disable Windows Copilot via Group Policy registry keys",
        tier: "red",
        params: [],
        execute: async () => this.disableCopilot(),
      },
      {
        id: "rwai-remove-copilot",
        name: "Remove Copilot app",
        description: "Uninstall the Windows Copilot app package",
        tier: "red",
        params: [],
        execute: async () => this.removeCopilot(),
      },
      {
        id: "rwai-disable-recall",
        name: "Disable Recall",
        description: "Disable Windows Recall (AI screenshot feature) via registry",
        tier: "red",
        params: [],
        execute: async () => this.disableRecall(),
      },
      {
        id: "rwai-check-ai-features",
        name: "Check AI features",
        description: "List all Windows AI-related packages and their status",
        tier: "green",
        params: [],
        execute: async () => this.checkAIFeatures(),
      },
      {
        id: "rwai-remove-all-ai",
        name: "Remove all Windows AI",
        description: "Disable Copilot, Recall, and remove all AI-related app packages",
        tier: "red",
        params: [],
        execute: async () => this.removeAllAI(),
      },
    ];
  }

  private async checkCopilot(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `$pkg = Get-AppxPackage -Name '*Copilot*' 2>$null; if ($pkg) { $pkg | Select-Object Name, Version, Status | Format-List | Out-String } else { 'Copilot package not found.' }; $reg = Get-ItemProperty -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -ErrorAction SilentlyContinue; if ($reg) { \"Policy: TurnOffWindowsCopilot = $($reg.TurnOffWindowsCopilot)\" } else { 'No Copilot policy set.' }`,
        15_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async disableCopilot(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        [
          "New-Item -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot' -Force | Out-Null",
          "Set-ItemProperty -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -Value 1 -Type DWord -Force",
          "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot' -Force -ErrorAction SilentlyContinue | Out-Null",
          "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue",
          "Write-Output 'Windows Copilot disabled via policy. Changes take effect after restart or Explorer refresh.'",
        ].join("; "),
        30_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async removeCopilot(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        [
          "$pkgs = Get-AppxPackage -AllUsers -Name '*Copilot*' 2>$null",
          "if ($pkgs) { $pkgs | ForEach-Object { Remove-AppxPackage -Package $_.PackageFullName -AllUsers -ErrorAction SilentlyContinue; Write-Output \"Removed: $($_.Name)\" } } else { Write-Output 'No Copilot packages found.' }",
          "$provPkgs = Get-AppxProvisionedPackage -Online 2>$null | Where-Object { $_.DisplayName -like '*Copilot*' }",
          "if ($provPkgs) { $provPkgs | ForEach-Object { Remove-AppxProvisionedPackage -Online -PackageName $_.PackageName -ErrorAction SilentlyContinue; Write-Output \"Deprovisioned: $($_.DisplayName)\" } }",
        ].join("; "),
        60_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async disableRecall(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        [
          "New-Item -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsAI' -Force | Out-Null",
          "Set-ItemProperty -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsAI' -Name 'DisableAIDataAnalysis' -Value 1 -Type DWord -Force",
          "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI' -Force -ErrorAction SilentlyContinue | Out-Null",
          "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI' -Name 'DisableAIDataAnalysis' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue",
          "Write-Output 'Windows Recall disabled via policy.'",
        ].join("; "),
        30_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async checkAIFeatures(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        [
          "Write-Output '=== AI App Packages ==='",
          "Get-AppxPackage -AllUsers 2>$null | Where-Object { $_.Name -match 'Copilot|CoPilot|AI|Recall|cognitiveservices' } | Select-Object Name, Version | Format-Table -AutoSize | Out-String",
          "Write-Output '=== AI Policy Keys ==='",
          "Get-ItemProperty -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot' -ErrorAction SilentlyContinue | Out-String",
          "Get-ItemProperty -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsAI' -ErrorAction SilentlyContinue | Out-String",
        ].join("; "),
        15_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async removeAllAI(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Combine disable + remove operations
      const disableCopilotResult = await this.disableCopilot();
      const disableRecallResult = await this.disableRecall();
      const removeCopilotResult = await this.removeCopilot();

      const combinedOutput = [
        "=== Disable Copilot ===",
        disableCopilotResult.output || disableCopilotResult.error || "",
        "=== Disable Recall ===",
        disableRecallResult.output || disableRecallResult.error || "",
        "=== Remove Copilot Packages ===",
        removeCopilotResult.output || removeCopilotResult.error || "",
      ].join("\n");

      const allSuccess = disableCopilotResult.success && disableRecallResult.success && removeCopilotResult.success;
      return { success: allSuccess, toolId: this.id, output: combinedOutput, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
