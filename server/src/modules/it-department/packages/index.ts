// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { DomainOrchestrator, ToolWrapper } from "../tool-types.js";
import { WingetWrapper } from "./winget.js";
import { ScoopWrapper } from "./scoop.js";
import { ChocolateyWrapper } from "./chocolatey.js";

const winget = new WingetWrapper();
const scoop = new ScoopWrapper();
const chocolatey = new ChocolateyWrapper();

export const packagesOrchestrator: DomainOrchestrator = {
  domain: "packages",
  name: "Package Management",
  description: "Install, update, search, and remove software packages",

  // For each intent, try tools in this order (first available wins)
  intentMap: {
    "search": ["winget", "scoop", "chocolatey"],
    "list-installed": ["winget", "scoop", "chocolatey"],
    "install": ["winget", "scoop", "chocolatey"],
    "upgrade": ["winget", "scoop", "chocolatey"],
    "upgrade-all": ["winget", "scoop", "chocolatey"],
    "uninstall": ["winget", "scoop", "chocolatey"],
    "add-bucket": ["scoop"],
  },

  getTools(): ToolWrapper[] {
    return [winget, scoop, chocolatey];
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
        error: `Unknown intent for packages domain: ${intent}`,
        duration: 0,
      };
    }

    // Map intent to the operation ID pattern for each tool
    const intentToOp: Record<string, Record<string, string>> = {
      "search": { winget: "winget-search", scoop: "scoop-search", chocolatey: "choco-search" },
      "list-installed": { winget: "winget-list", scoop: "scoop-list", chocolatey: "choco-list" },
      "install": { winget: "winget-install", scoop: "scoop-install", chocolatey: "choco-install" },
      "upgrade": { winget: "winget-upgrade", scoop: "scoop-update", chocolatey: "choco-upgrade" },
      "upgrade-all": { winget: "winget-upgrade", scoop: "scoop-update", chocolatey: "choco-upgrade" },
      "uninstall": { winget: "winget-uninstall", scoop: "scoop-uninstall", chocolatey: "choco-uninstall" },
      "add-bucket": { scoop: "scoop-bucket-add" },
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

      // Normalize params for different tools
      const normalizedParams = normalizeParams(intent, params, toolId);
      return operation.execute(normalizedParams);
    }

    return {
      success: false,
      toolId: "none",
      error: `No installed package manager available for intent: ${intent}. Install winget, scoop, or chocolatey.`,
      duration: 0,
    };
  },
};

/** Normalize param names across tools (e.g. winget uses "id", scoop uses "name") */
function normalizeParams(
  intent: string,
  params: Record<string, string>,
  toolId: string,
): Record<string, string> {
  const normalized = { ...params };

  // The generic param is "package" — map to tool-specific names
  if (params.package) {
    if (toolId === "winget") {
      normalized.id = params.package;
      normalized.query = params.package;
    } else {
      normalized.name = params.package;
      normalized.query = params.package;
    }
  }

  // For upgrade-all intent, set the right "all" value
  if (intent === "upgrade-all") {
    if (toolId === "winget") normalized.id = "all";
    else if (toolId === "scoop") normalized.name = "*";
    else if (toolId === "chocolatey") normalized.name = "all";
  }

  return normalized;
}
