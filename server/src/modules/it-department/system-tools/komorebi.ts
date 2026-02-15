// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync } from "../utils.js";

export class KomorebiWrapper implements ToolWrapper {
  id = "komorebi";
  name = "komorebi";
  description = "Tiling window manager for Windows. Automatic window arrangement with keyboard-driven workflows, workspaces, and rules.";
  domain = "system-tools" as const;
  installMethod = "winget";
  installCommand = "winget install LGUG2Z.komorebi";

  async detect(): Promise<ToolStatus> {
    try {
      const output = await execAsync("komorebic --version", 10_000);
      const version = output.trim();
      return { installed: true, version };
    } catch {
      return { installed: false };
    }
  }

  getOperations(): ToolOperation[] {
    return [
      {
        id: "komorebi-start",
        name: "Start komorebi",
        description: "Start the komorebi tiling window manager",
        tier: "yellow",
        params: [],
        execute: async () => this.start(),
      },
      {
        id: "komorebi-stop",
        name: "Stop komorebi",
        description: "Stop the komorebi tiling window manager and restore normal window behavior",
        tier: "yellow",
        params: [],
        execute: async () => this.stop(),
      },
      {
        id: "komorebi-status",
        name: "Komorebi status",
        description: "Check current komorebi state — workspaces, monitors, and managed windows",
        tier: "green",
        params: [],
        execute: async () => this.status(),
      },
      {
        id: "komorebi-retile",
        name: "Retile windows",
        description: "Force retile all windows in the current workspace",
        tier: "green",
        params: [],
        execute: async () => this.retile(),
      },
      {
        id: "komorebi-toggle-float",
        name: "Toggle float",
        description: "Toggle floating mode for the focused window",
        tier: "green",
        params: [],
        execute: async () => this.toggleFloat(),
      },
      {
        id: "komorebi-change-layout",
        name: "Change layout",
        description: "Change the tiling layout for the current workspace",
        tier: "green",
        params: [{ name: "layout", description: "Layout: bsp, columns, rows, vertical-stack, horizontal-stack", required: true }],
        execute: async (params) => this.changeLayout(params.layout),
      },
    ];
  }

  private async start(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("komorebic start --whkd", 15_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "komorebi started with whkd hotkey daemon.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async stop(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("komorebic stop", 10_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "komorebi stopped. Normal window behavior restored.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async status(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("komorebic state 2>&1", 15_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return {
        success: false,
        toolId: this.id,
        error: err.message.includes("No connection")
          ? "komorebi is not running. Start it with 'komorebic start'."
          : err.message,
        duration: Date.now() - start,
      };
    }
  }

  private async retile(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("komorebic retile", 5_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "Windows retiled.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async toggleFloat(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync("komorebic toggle-float", 5_000);
      return {
        success: true,
        toolId: this.id,
        output: output || "Float toggled for focused window.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async changeLayout(layout: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await execAsync(`komorebic change-layout ${layout}`, 5_000);
      return {
        success: true,
        toolId: this.id,
        output: output || `Layout changed to ${layout}.`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
