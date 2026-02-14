// Copyright 2025 #1 Future — Apache 2.0 License

import { hostname, platform, uptime, cpus, totalmem, freemem, networkInterfaces } from "node:os";
import type { FastifyPluginAsync } from "fastify";
import type { SystemStatus, DiskInfo, NetworkInfo } from "@futurebuddy/shared";
import { execAsync } from "../modules/it-department/utils.js";

export const systemRoutes: FastifyPluginAsync = async (app) => {
  // Get system status
  app.get("/status", async () => {
    const cpuInfo = cpus();
    const nets = networkInterfaces();

    const networkList: NetworkInfo[] = [];
    for (const [name, addrs] of Object.entries(nets)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === "IPv4" && !addr.internal) {
          networkList.push({
            name,
            ip: addr.address,
            mac: addr.mac,
            type: name.toLowerCase().includes("wi-fi") ? "wifi" : "ethernet",
          });
        }
      }
    }

    // Get disk info (Windows)
    let disks: DiskInfo[] = [];
    try {
      const diskOutput = await execAsync(
        "powershell -Command \"Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N='Used';E={$_.Used}}, @{N='Free';E={$_.Free}}, @{N='Total';E={$_.Used+$_.Free}}, Description | ConvertTo-Json\"",
      );
      const parsed = JSON.parse(diskOutput);
      const drives = Array.isArray(parsed) ? parsed : [parsed];
      disks = drives
        .filter((d: any) => d.Total > 0)
        .map((d: any) => ({
          mount: `${d.Name}:\\`,
          label: d.Description || d.Name,
          total: d.Total,
          used: d.Used,
          free: d.Free,
        }));
    } catch {
      // Fallback if PowerShell fails
    }

    const status: SystemStatus = {
      hostname: hostname(),
      platform: platform(),
      uptime: uptime(),
      cpu: {
        model: cpuInfo[0]?.model || "Unknown",
        usage: 0, // Would need sampling over time for accurate CPU usage
        cores: cpuInfo.length,
      },
      memory: {
        total: totalmem(),
        used: totalmem() - freemem(),
        free: freemem(),
      },
      disk: disks,
      network: networkList,
    };

    return status;
  });

  // Get security scan
  app.get("/security", async () => {
    const { runSecurityScan } = await import("../modules/it-department/security-monitor.js");
    return runSecurityScan();
  });

  // Apply a system configuration
  app.post<{ Body: { module: string; action: string; params?: Record<string, string> } }>(
    "/config",
    async (request, reply) => {
      const { module, action, params } = request.body;
      const { applySystemConfig } = await import("../modules/it-department/system-config.js");

      try {
        const result = await applySystemConfig(module, action, params || {});
        return result;
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    },
  );
};
