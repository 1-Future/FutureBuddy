// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { DomainOrchestrator, ToolWrapper } from "../tool-types.js";
import { PowerToysWrapper } from "./powertoys.js";
import { SystemInformerWrapper } from "./system-informer.js";
import { ChezmoiWrapper } from "./chezmoi.js";
import { KomorebiWrapper } from "./komorebi.js";

const powertoys = new PowerToysWrapper();
const systemInformer = new SystemInformerWrapper();
const chezmoi = new ChezmoiWrapper();
const komorebi = new KomorebiWrapper();

export const systemToolsOrchestrator: DomainOrchestrator = {
  domain: "system-tools",
  name: "System Tools",
  description: "Productivity utilities, process management, dotfile sync, and window management",

  intentMap: {
    "launch-powertoys": ["powertoys"],
    "powertoys-status": ["powertoys"],
    "install-powertoys": ["powertoys"],
    "update-powertoys": ["powertoys"],
    "top-processes": ["system-informer"],
    "find-process": ["system-informer"],
    "kill-process": ["system-informer"],
    "list-services": ["system-informer"],
    "network-connections": ["system-informer"],
    "launch-process-manager": ["system-informer"],
    "dotfile-status": ["chezmoi"],
    "dotfile-list": ["chezmoi"],
    "dotfile-diff": ["chezmoi"],
    "dotfile-apply": ["chezmoi"],
    "dotfile-add": ["chezmoi"],
    "dotfile-update": ["chezmoi"],
    "dotfile-init": ["chezmoi"],
    "start-tiling": ["komorebi"],
    "stop-tiling": ["komorebi"],
    "tiling-status": ["komorebi"],
    "retile": ["komorebi"],
    "toggle-float": ["komorebi"],
    "change-layout": ["komorebi"],
  },

  getTools(): ToolWrapper[] {
    return [powertoys, systemInformer, chezmoi, komorebi];
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
        error: `Unknown intent for system-tools domain: ${intent}`,
        duration: 0,
      };
    }

    const intentToOp: Record<string, Record<string, string>> = {
      "launch-powertoys": { powertoys: "powertoys-launch" },
      "powertoys-status": { powertoys: "powertoys-status" },
      "install-powertoys": { powertoys: "powertoys-install" },
      "update-powertoys": { powertoys: "powertoys-update" },
      "top-processes": { "system-informer": "si-top-processes" },
      "find-process": { "system-informer": "si-find-process" },
      "kill-process": { "system-informer": "si-kill-process" },
      "list-services": { "system-informer": "si-services" },
      "network-connections": { "system-informer": "si-network-connections" },
      "launch-process-manager": { "system-informer": "si-launch" },
      "dotfile-status": { chezmoi: "chezmoi-status" },
      "dotfile-list": { chezmoi: "chezmoi-managed" },
      "dotfile-diff": { chezmoi: "chezmoi-diff" },
      "dotfile-apply": { chezmoi: "chezmoi-apply" },
      "dotfile-add": { chezmoi: "chezmoi-add" },
      "dotfile-update": { chezmoi: "chezmoi-update" },
      "dotfile-init": { chezmoi: "chezmoi-init" },
      "start-tiling": { komorebi: "komorebi-start" },
      "stop-tiling": { komorebi: "komorebi-stop" },
      "tiling-status": { komorebi: "komorebi-status" },
      "retile": { komorebi: "komorebi-retile" },
      "toggle-float": { komorebi: "komorebi-toggle-float" },
      "change-layout": { komorebi: "komorebi-change-layout" },
    };

    const tools = this.getTools();
    const toolMap = new Map(tools.map((t) => [t.id, t]));

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
      error: `No installed system tool available for intent: ${intent}.`,
      duration: 0,
    };
  },
};
