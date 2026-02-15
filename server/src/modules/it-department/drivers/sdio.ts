// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class SDIOWrapper implements ToolWrapper {
  id = "sdio";
  name = "Snappy Driver Installer Origin";
  description = "Offline driver installer. Scans hardware and installs matching drivers from local or downloaded packs.";
  domain = "drivers" as const;
  installMethod = "portable";
  installCommand = "winget install GlennDelahoy.SnappyDriverInstallerOrigin";

  async detect(): Promise<ToolStatus> {
    try {
      // SDIO is a portable app — check common install locations
      const paths = [
        "C:\\tools\\SDIO\\SDIO_x64_R764.exe",
        "C:\\tools\\sdio\\SDIO.exe",
        "%USERPROFILE%\\scoop\\apps\\snappy-driver-installer-origin\\current\\SDIO.exe",
      ];

      for (const path of paths) {
        try {
          const expanded = await execAsync(`cmd /c echo ${path}`, 5_000);
          await execAsync(`cmd /c if exist "${expanded.trim()}" echo found`, 5_000);
          return { installed: true, path: expanded.trim() };
        } catch {
          continue;
        }
      }

      // Try winget to see if installed
      const wingetOut = await execAsync(
        'winget list --id GlennDelahoy.SnappyDriverInstallerOrigin --accept-source-agreements 2>&1',
        15_000,
      );
      if (wingetOut.includes("GlennDelahoy")) {
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
        id: "sdio-scan",
        name: "Scan for missing drivers",
        description: "Use SDIO to scan hardware for missing or outdated drivers (requires SDIO to be installed)",
        tier: "green",
        params: [],
        execute: async () => this.scan(),
      },
      {
        id: "sdio-install",
        name: "Install drivers via SDIO",
        description: "Launch SDIO to install recommended driver updates",
        tier: "yellow",
        params: [],
        execute: async () => this.install(),
      },
    ];
  }

  private async scan(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // SDIO is primarily a GUI tool, but we can invoke its CLI scan
      const output = await execAsync("SDIO.exe -checkupdates 2>&1", 120_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return {
        success: false,
        toolId: this.id,
        error: `SDIO scan failed: ${err.message}. SDIO may need to be launched manually for full functionality.`,
        duration: Date.now() - start,
      };
    }
  }

  private async install(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Launch SDIO in GUI mode for user-driven installation
      await execAsync("start SDIO.exe", 5_000);
      return {
        success: true,
        toolId: this.id,
        output: "Snappy Driver Installer Origin launched. Follow the GUI to install drivers.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
