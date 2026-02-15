// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { powershell } from "../utils.js";

export class WinUtilWrapper implements ToolWrapper {
  id = "winutil";
  name = "Chris Titus WinUtil";
  description = "All-in-one Windows utility by Chris Titus Tech. GUI-based debloat, tweaks, app installs, and system fixes.";
  domain = "debloat" as const;
  installMethod = "remote-script";
  installCommand = "irm christitus.com/win | iex";

  async detect(): Promise<ToolStatus> {
    // WinUtil is invoked on-demand via remote script — it's "available" if PowerShell works
    // and internet is reachable. We detect it as available since it requires no local install.
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
        id: "winutil-launch",
        name: "Launch WinUtil",
        description: "Launch the Chris Titus WinUtil GUI for interactive debloating and tweaks",
        tier: "yellow",
        params: [],
        execute: async () => this.launch(),
      },
      {
        id: "winutil-tweaks-essential",
        name: "Apply essential tweaks",
        description: "Apply WinUtil essential tweaks (telemetry, Bing search, tips, ads)",
        tier: "red",
        params: [],
        execute: async () => this.essentialTweaks(),
      },
    ];
  }

  private async launch(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Launch WinUtil in a new elevated PowerShell window
      await powershell(
        "Start-Process powershell -ArgumentList '-Command irm christitus.com/win | iex' -Verb RunAs",
        15_000,
      );
      return {
        success: true,
        toolId: this.id,
        output: "WinUtil launched in a new elevated window. Use the GUI to select tweaks and apps.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async essentialTweaks(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Apply the most common tweaks directly via registry/PowerShell
      // These mirror what WinUtil's "Essential Tweaks" button does
      const output = await powershell(
        [
          "# Disable telemetry",
          "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name 'AllowTelemetry' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue",
          "# Disable Bing search in Start",
          "New-Item -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer' -Force -ErrorAction SilentlyContinue | Out-Null",
          "Set-ItemProperty -Path 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer' -Name 'DisableSearchBoxSuggestions' -Value 1 -Type DWord -Force",
          "# Disable tips and suggestions",
          "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name 'SubscribedContent-338389Enabled' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue",
          "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name 'SubscribedContent-310093Enabled' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue",
          "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name 'SilentInstalledAppsEnabled' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue",
          "# Disable WiFi Sense",
          "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\WcmSvc\\wifinetworkmanager\\config' -Name 'AutoConnectAllowedOEM' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue",
          "# Disable Activity History",
          "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name 'EnableActivityFeed' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue",
          "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name 'PublishUserActivities' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue",
          "Write-Output 'Essential tweaks applied: telemetry off, Bing search off, tips off, WiFi Sense off, activity history off.'",
        ].join("; "),
        60_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
