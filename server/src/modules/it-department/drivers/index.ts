// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { DomainOrchestrator, ToolWrapper } from "../tool-types.js";
import { PnpUtilWrapper } from "./pnputil.js";
import { PSWindowsUpdateWrapper } from "./pswindowsupdate.js";
import { NvidiaDownloaderWrapper } from "./nvidia-downloader.js";
import { SDIOWrapper } from "./sdio.js";
import { DDUWrapper } from "./ddu.js";
import { RaprWrapper } from "./rapr.js";

const pnputil = new PnpUtilWrapper();
const pswindowsupdate = new PSWindowsUpdateWrapper();
const nvidiaDownloader = new NvidiaDownloaderWrapper();
const sdio = new SDIOWrapper();
const ddu = new DDUWrapper();
const rapr = new RaprWrapper();

export const driversOrchestrator: DomainOrchestrator = {
  domain: "drivers",
  name: "Driver Management",
  description: "Detect, update, clean, and manage hardware drivers",

  // For each intent, try tools in this order (first available wins)
  intentMap: {
    "list-drivers": ["pnputil", "rapr"],
    "list-devices": ["pnputil"],
    "check-updates": ["pswindowsupdate", "nvidia-downloader", "pnputil"],
    "install-updates": ["pswindowsupdate", "nvidia-downloader"],
    "gpu-info": ["nvidia-downloader"],
    "gpu-update": ["nvidia-downloader"],
    "scan-missing": ["sdio", "pnputil"],
    "clean-uninstall-gpu": ["ddu"],
    "driver-store-cleanup": ["rapr", "pnputil"],
    "export-driver": ["pnputil"],
    "delete-driver": ["pnputil"],
    "update-history": ["pswindowsupdate"],
  },

  getTools(): ToolWrapper[] {
    return [pnputil, pswindowsupdate, nvidiaDownloader, sdio, ddu, rapr];
  },

  async execute(
    intent: string,
    params: Record<string, string>,
    installedToolIds: Set<string>,
  ): Promise<ToolOperationResult> {
    const toolOrder = this.intentMap[intent];
    if (!toolOrder) {
      return {
        success: false,
        toolId: "unknown",
        error: `Unknown intent for drivers domain: ${intent}`,
        duration: 0,
      };
    }

    // Map intent to tool-specific operation IDs
    const intentToOp: Record<string, Record<string, string>> = {
      "list-drivers": { pnputil: "pnputil-list-drivers", rapr: "rapr-list-old" },
      "list-devices": { pnputil: "pnputil-list-devices" },
      "check-updates": {
        pswindowsupdate: "pswu-check-drivers",
        "nvidia-downloader": "nvidia-check-update",
        pnputil: "pnputil-list-drivers",
      },
      "install-updates": {
        pswindowsupdate: "pswu-install-drivers",
        "nvidia-downloader": "nvidia-install-update",
      },
      "gpu-info": { "nvidia-downloader": "nvidia-gpu-info" },
      "gpu-update": { "nvidia-downloader": "nvidia-install-update" },
      "scan-missing": { sdio: "sdio-scan", pnputil: "pnputil-list-devices" },
      "clean-uninstall-gpu": {
        ddu: params.gpu === "amd" ? "ddu-clean-amd"
          : params.gpu === "intel" ? "ddu-clean-intel"
          : "ddu-clean-nvidia",
      },
      "driver-store-cleanup": { rapr: "rapr-cleanup", pnputil: "pnputil-list-drivers" },
      "export-driver": { pnputil: "pnputil-export-driver" },
      "delete-driver": { pnputil: "pnputil-delete-driver" },
      "update-history": { pswindowsupdate: "pswu-history" },
    };

    const tools = this.getTools();
    const toolMap = new Map(tools.map((t) => [t.id, t]));

    // Try each tool in preference order
    for (const toolId of toolOrder) {
      if (!installedToolIds.has(toolId)) continue;

      const tool = toolMap.get(toolId);
      if (!tool) continue;

      const opId = intentToOp[intent]?.[toolId];
      if (!opId) continue;

      const operation = tool.getOperations().find((op) => op.id === opId);
      if (!operation) continue;

      return operation.execute(params);
    }

    return {
      success: false,
      toolId: "none",
      error: `No installed driver tool available for intent: ${intent}. Consider installing PSWindowsUpdate or Snappy Driver Installer Origin.`,
      duration: 0,
    };
  },
};
