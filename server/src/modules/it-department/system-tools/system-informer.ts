// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { ToolWrapper, ToolStatus, ToolOperation } from "../tool-types.js";
import { execAsync, powershell } from "../utils.js";

export class SystemInformerWrapper implements ToolWrapper {
  id = "system-informer";
  name = "System Informer";
  description = "Advanced process manager (fork of Process Hacker). View processes, services, network connections, and system resource usage.";
  domain = "system-tools" as const;
  installMethod = "winget";
  installCommand = "winget install winsiderss.SystemInformer";

  async detect(): Promise<ToolStatus> {
    try {
      const wingetOut = await execAsync(
        'winget list --id winsiderss.SystemInformer --accept-source-agreements 2>&1',
        15_000,
      );
      if (wingetOut.includes("SystemInformer")) {
        return { installed: true };
      }

      const paths = [
        "C:\\Program Files\\SystemInformer\\SystemInformer.exe",
        "C:\\tools\\SystemInformer\\SystemInformer.exe",
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
        id: "si-launch",
        name: "Launch System Informer",
        description: "Open System Informer for process and system inspection",
        tier: "green",
        params: [],
        execute: async () => this.launch(),
      },
      {
        id: "si-top-processes",
        name: "Top processes",
        description: "List the top processes by CPU or memory usage",
        tier: "green",
        params: [{ name: "sort", description: "Sort by: cpu or memory", required: false, default: "cpu" }],
        execute: async (params) => this.topProcesses(params.sort || "cpu"),
      },
      {
        id: "si-find-process",
        name: "Find process",
        description: "Search for a running process by name",
        tier: "green",
        params: [{ name: "name", description: "Process name to search for", required: true }],
        execute: async (params) => this.findProcess(params.name),
      },
      {
        id: "si-kill-process",
        name: "Kill process",
        description: "Terminate a process by name or PID",
        tier: "red",
        params: [{ name: "target", description: "Process name or PID to kill", required: true }],
        execute: async (params) => this.killProcess(params.target),
      },
      {
        id: "si-services",
        name: "List services",
        description: "List running Windows services",
        tier: "green",
        params: [],
        execute: async () => this.listServices(),
      },
      {
        id: "si-network-connections",
        name: "Network connections",
        description: "List active network connections and listening ports",
        tier: "green",
        params: [],
        execute: async () => this.networkConnections(),
      },
    ];
  }

  private async launch(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      await execAsync('start "" "SystemInformer.exe"', 5_000);
      return {
        success: true,
        toolId: this.id,
        output: "System Informer launched.",
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async topProcesses(sort: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const sortProp = sort === "memory" ? "WorkingSet64" : "CPU";
      const output = await powershell(
        `Get-Process | Sort-Object -Property ${sortProp} -Descending | Select-Object -First 20 Name, Id, CPU, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | Format-Table -AutoSize | Out-String -Width 120`,
        15_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async findProcess(name: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        `Get-Process -Name '*${name}*' -ErrorAction SilentlyContinue | Select-Object Name, Id, CPU, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,1)}}, Path | Format-Table -AutoSize | Out-String -Width 200`,
        10_000,
      );
      return {
        success: true,
        toolId: this.id,
        output: output || `No processes matching "${name}" found.`,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async killProcess(target: string): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      // Try as PID first, then as name
      const isNum = /^\d+$/.test(target);
      const cmd = isNum
        ? `Stop-Process -Id ${target} -Force -ErrorAction Stop; Write-Output 'Process ${target} terminated.'`
        : `Stop-Process -Name '${target}' -Force -ErrorAction Stop; Write-Output 'Process ${target} terminated.'`;
      const output = await powershell(cmd, 15_000);
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async listServices(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        "Get-Service | Where-Object { $_.Status -eq 'Running' } | Sort-Object DisplayName | Select-Object Status, Name, DisplayName | Format-Table -AutoSize | Out-String -Width 200",
        15_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }

  private async networkConnections(): Promise<ToolOperationResult> {
    const start = Date.now();
    try {
      const output = await powershell(
        "Get-NetTCPConnection | Where-Object { $_.State -eq 'Established' -or $_.State -eq 'Listen' } | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State, @{N='Process';E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Name}} | Sort-Object State, LocalPort | Format-Table -AutoSize | Out-String -Width 200",
        15_000,
      );
      return { success: true, toolId: this.id, output, duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, toolId: this.id, error: err.message, duration: Date.now() - start };
    }
  }
}
