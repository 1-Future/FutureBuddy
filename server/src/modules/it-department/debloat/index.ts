// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { DomainOrchestrator, ToolWrapper } from "../tool-types.js";
import { Win11DebloatWrapper } from "./win11debloat.js";
import { RemoveWindowsAIWrapper } from "./remove-windows-ai.js";
import { SophiaWrapper } from "./sophia.js";
import { WinUtilWrapper } from "./winutil.js";
import { BCUninstallerWrapper } from "./bcuninstaller.js";

const win11debloat = new Win11DebloatWrapper();
const removeWindowsAI = new RemoveWindowsAIWrapper();
const sophia = new SophiaWrapper();
const winutil = new WinUtilWrapper();
const bcuninstaller = new BCUninstallerWrapper();

export const debloatOrchestrator: DomainOrchestrator = {
  domain: "debloat",
  name: "Debloat & Privacy",
  description: "Remove bloatware, disable telemetry, strip AI features, and clean up Windows",

  intentMap: {
    "remove-bloatware": ["win11debloat", "winutil"],
    "disable-telemetry": ["sophia", "win11debloat", "winutil"],
    "disable-bing-search": ["win11debloat", "sophia"],
    "disable-suggestions": ["sophia", "win11debloat"],
    "clean-taskbar": ["win11debloat", "sophia"],
    "privacy-tweaks": ["sophia", "winutil"],
    "check-copilot": ["remove-windows-ai"],
    "disable-copilot": ["remove-windows-ai"],
    "remove-copilot": ["remove-windows-ai"],
    "disable-recall": ["remove-windows-ai"],
    "check-ai-features": ["remove-windows-ai"],
    "remove-all-ai": ["remove-windows-ai"],
    "essential-tweaks": ["winutil", "win11debloat"],
    "launch-debloat-gui": ["winutil", "bcuninstaller"],
    "list-programs": ["bcuninstaller"],
    "uninstall-program": ["bcuninstaller"],
    "batch-uninstall": ["bcuninstaller"],
    "custom-sophia-tweak": ["sophia"],
  },

  getTools(): ToolWrapper[] {
    return [win11debloat, removeWindowsAI, sophia, winutil, bcuninstaller];
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
        error: `Unknown intent for debloat domain: ${intent}`,
        duration: 0,
      };
    }

    const intentToOp: Record<string, Record<string, string>> = {
      "remove-bloatware": { win11debloat: "win11debloat-apps-only", winutil: "winutil-launch" },
      "disable-telemetry": { sophia: "sophia-disable-telemetry", win11debloat: "win11debloat-disable-telemetry", winutil: "winutil-tweaks-essential" },
      "disable-bing-search": { win11debloat: "win11debloat-disable-bing", sophia: "sophia-ui-tweaks" },
      "disable-suggestions": { sophia: "sophia-disable-suggestions", win11debloat: "win11debloat-default" },
      "clean-taskbar": { win11debloat: "win11debloat-restore-taskbar", sophia: "sophia-ui-tweaks" },
      "privacy-tweaks": { sophia: "sophia-privacy-tweaks", winutil: "winutil-tweaks-essential" },
      "check-copilot": { "remove-windows-ai": "rwai-check-copilot" },
      "disable-copilot": { "remove-windows-ai": "rwai-disable-copilot" },
      "remove-copilot": { "remove-windows-ai": "rwai-remove-copilot" },
      "disable-recall": { "remove-windows-ai": "rwai-disable-recall" },
      "check-ai-features": { "remove-windows-ai": "rwai-check-ai-features" },
      "remove-all-ai": { "remove-windows-ai": "rwai-remove-all-ai" },
      "essential-tweaks": { winutil: "winutil-tweaks-essential", win11debloat: "win11debloat-default" },
      "launch-debloat-gui": { winutil: "winutil-launch", bcuninstaller: "bcu-launch" },
      "list-programs": { bcuninstaller: "bcu-list" },
      "uninstall-program": { bcuninstaller: "bcu-uninstall" },
      "batch-uninstall": { bcuninstaller: "bcu-uninstall-quiet" },
      "custom-sophia-tweak": { sophia: "sophia-custom" },
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
      error: `No installed debloat tool available for intent: ${intent}. Try installing Win11Debloat (git clone) or launching WinUtil (irm christitus.com/win | iex).`,
      duration: 0,
    };
  },
};
