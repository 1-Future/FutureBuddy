// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync, powershell } from "../utils.js";

export class NvidiaDownloaderWrapper implements ToolWrapper {
  id = "nvidia-downloader";
  name = "NVIDIA Driver Tools";
  description = "Detect NVIDIA GPU and check for latest driver updates via nvidia-smi and PowerShell.";
  domain = "drivers" as const;
  installMethod = "bundled-with-driver";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("nvidia-smi --query-gpu=driver_version --format=csv,noheader", 10_000);
      const version = output.trim();
      return { installed: true, version, path: "nvidia-smi" };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "nvidia-gpu-info",
        name: "GPU info",
        description: "Get detailed NVIDIA GPU information (model, driver, VRAM, temperature)",
        tier: "green",
        params: [],
        execute: async () => this.gpuInfo(),
      },
      {
        id: "nvidia-driver-version",
        name: "Current driver version",
        description: "Get the currently installed NVIDIA driver version",
        tier: "green",
        params: [],
        execute: async () => this.driverVersion(),
      },
      {
        id: "nvidia-check-update",
        name: "Check for driver update",
        description: "Check if a newer NVIDIA driver is available via winget",
        tier: "green",
        params: [],
        execute: async () => this.checkUpdate(),
      },
      {
        id: "nvidia-install-update",
        name: "Update NVIDIA driver",
        description: "Download and install the latest NVIDIA driver via winget",
        tier: "yellow",
        params: [],
        execute: async () => this.installUpdate(),
      },
    ];
  }

  private async gpuInfo(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(
        "nvidia-smi --query-gpu=name,driver_version,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu,utilization.memory --format=csv",
        15_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async driverVersion(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(
        "nvidia-smi --query-gpu=driver_version,name --format=csv,noheader",
        10_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async checkUpdate(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Use winget to check if NVIDIA driver has an update
      const output = await execAsync(
        'winget upgrade --id Nvidia.GeForceExperience --accept-source-agreements 2>&1 || winget upgrade --query "NVIDIA" --accept-source-agreements 2>&1',
        30_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      // Also try PowerShell Get-WmiObject approach
      try {
        const psOutput = await powershell(
          "Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like '*NVIDIA*' } | Select-Object Name, DriverVersion, DriverDate | Format-List | Out-String",
          15_000,
        );
        return { success: true, toolId: this.id, output: psOutput, duration: Date.now() - start };
      } catch {
        return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
      }
    }
  }

  private async installUpdate(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(
        "winget upgrade --id Nvidia.GeForceExperience --accept-package-agreements --accept-source-agreements",
        300_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
