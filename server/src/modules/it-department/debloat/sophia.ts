// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync, powershell } from "../utils.js";

export class SophiaWrapper implements ToolWrapper {
  id = "sophia";
  name = "Sophia Script";
  description = "150+ granular Windows tweaks and debloat toggles. Fine-grained control over telemetry, privacy, UI, and scheduled tasks.";
  domain = "debloat" as const;
  installMethod = "git-clone";
  installCommand = "git clone https://github.com/farag2/Sophia-Script-for-Windows.git C:\\tools\\Sophia";

  async detect(): Promise<ToolStatus> {
    try {
      const paths = [
        "C:\\tools\\Sophia\\Sophia Script for Windows 11\\Sophia.ps1",
        "C:\\tools\\Sophia-Script-for-Windows\\Sophia Script for Windows 11\\Sophia.ps1",
        "C:\\tools\\sophia\\Sophia.ps1",
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
        id: "sophia-disable-telemetry",
        name: "Disable telemetry",
        description: "Disable Windows diagnostic data and telemetry collection",
        tier: "red",
        params: [],
        execute: async () => this.runTweak("DiagnosticDataLevel -Minimal", "Telemetry set to minimal"),
      },
      {
        id: "sophia-disable-suggestions",
        name: "Disable suggestions & tips",
        description: "Disable Windows suggestions, tips, and app recommendations",
        tier: "yellow",
        params: [],
        execute: async () => this.runTweak(
          "WindowsSuggestedContent -Disable; AppsSilentInstalling -Disable; TailoredExperiences -Disable",
          "Suggestions and tips disabled",
        ),
      },
      {
        id: "sophia-privacy-tweaks",
        name: "Apply privacy tweaks",
        description: "Disable advertising ID, activity history, and feedback notifications",
        tier: "red",
        params: [],
        execute: async () => this.runTweak(
          "AdvertisingID -Disable; ActivityHistory -Disable; FeedbackFrequency -Never",
          "Privacy tweaks applied",
        ),
      },
      {
        id: "sophia-disable-scheduled-tasks",
        name: "Disable telemetry tasks",
        description: "Disable scheduled tasks related to telemetry and data collection",
        tier: "red",
        params: [],
        execute: async () => this.runTweak(
          "ScheduledTasks -Disable",
          "Telemetry scheduled tasks disabled",
        ),
      },
      {
        id: "sophia-ui-tweaks",
        name: "Apply UI tweaks",
        description: "Restore classic context menu, hide widgets, clean taskbar",
        tier: "yellow",
        params: [],
        execute: async () => this.runTweak(
          "Windows11ContextMenu -Enable; Widgets -Disable; TaskViewButton -Hide",
          "UI tweaks applied",
        ),
      },
      {
        id: "sophia-custom",
        name: "Run custom Sophia function",
        description: "Run a specific Sophia Script function by name",
        tier: "red",
        params: [{ name: "function", description: "Sophia function call (e.g. 'OneDrive -Uninstall')", required: true }],
        execute: async (params) => this.runTweak(params.function, `Executed: ${params.function}`),
      },
    ];
  }

  private async runTweak(functions: string, successMessage: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Sophia Script requires sourcing the module first
      const sophiaDir = "C:\\tools\\Sophia\\Sophia Script for Windows 11";
      const output = await powershell(
        `Set-Location '${sophiaDir}'; Import-Module '.\\Sophia.psd1' -Force; ${functions}`,
        120_000,
      );
      return {
        success: true,
        toolId: this.id,
        output: output || successMessage,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
