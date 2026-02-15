// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync, powershell } from "../utils.js";

export class PnpUtilWrapper implements ToolWrapper {
  id = "pnputil";
  name = "pnputil";
  description = "Built-in Windows driver utility. List, export, and manage driver packages in the driver store.";
  domain = "drivers" as const;
  installMethod = "built-in";

  async detect(): Promise<ToolStatus> {
    try {
      await execAsync("pnputil /?", 10_000);
      return { installed: true, path: "C:\\Windows\\System32\\pnputil.exe" };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "pnputil-list-drivers",
        name: "List installed drivers",
        description: "List all third-party driver packages in the driver store",
        tier: "green",
        params: [],
        execute: async () => this.listDrivers(),
      },
      {
        id: "pnputil-list-devices",
        name: "List devices",
        description: "List all connected PnP devices and their status",
        tier: "green",
        params: [],
        execute: async () => this.listDevices(),
      },
      {
        id: "pnputil-driver-info",
        name: "Get driver info",
        description: "Get details about a specific driver package",
        tier: "green",
        params: [{ name: "inf", description: "Published driver INF name (e.g. oem12.inf)", required: true }],
        execute: async (params) => this.driverInfo(params.inf),
      },
      {
        id: "pnputil-export-driver",
        name: "Export driver",
        description: "Export a driver package to a folder for backup",
        tier: "yellow",
        params: [
          { name: "inf", description: "Published driver INF name (e.g. oem12.inf)", required: true },
          { name: "destination", description: "Folder to export to", required: true },
        ],
        execute: async (params) => this.exportDriver(params.inf, params.destination),
      },
      {
        id: "pnputil-delete-driver",
        name: "Delete driver package",
        description: "Remove a driver package from the driver store",
        tier: "red",
        params: [{ name: "inf", description: "Published driver INF name (e.g. oem12.inf)", required: true }],
        execute: async (params) => this.deleteDriver(params.inf),
      },
    ];
  }

  private async listDrivers(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("pnputil /enum-drivers", 30_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async listDevices(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("pnputil /enum-devices /connected", 30_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async driverInfo(inf: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`pnputil /enum-drivers /inf ${inf}`, 15_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async exportDriver(inf: string, destination: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`pnputil /export-driver ${inf} "${destination}"`, 30_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async deleteDriver(inf: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`pnputil /delete-driver ${inf} /force`, 30_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
