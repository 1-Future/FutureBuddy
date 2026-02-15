// Copyright 2025 #1 Future — Apache 2.0 License

import type { ToolOperationResult } from "@futurebuddy/shared";
import type { DomainOrchestrator, ToolWrapper } from "../tool-types.js";
import { OrganizeToolWrapper } from "./organize-tool.js";
import { AIFilesWrapper } from "./aifiles.js";
import { WatchexecWrapper } from "./watchexec.js";
import { TagSpacesWrapper } from "./tagspaces.js";

const organizeTool = new OrganizeToolWrapper();
const aifiles = new AIFilesWrapper();
const watchexec = new WatchexecWrapper();
const tagspaces = new TagSpacesWrapper();

export const fileOpsOrchestrator: DomainOrchestrator = {
  domain: "file-ops",
  name: "File Operations",
  description: "Organize, tag, watch, and sort files using built-in and external tools",

  intentMap: {
    "organize": ["organize-tool", "aifiles"],
    "organize-preview": ["organize-tool", "aifiles"],
    "ai-organize": ["aifiles", "organize-tool"],
    "ai-organize-preview": ["aifiles", "organize-tool"],
    "watch": ["watchexec"],
    "auto-organize": ["watchexec"],
    "tag-files": ["tagspaces"],
    "launch-tagger": ["tagspaces"],
  },

  getTools(): ToolWrapper[] {
    return [organizeTool, aifiles, watchexec, tagspaces];
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
        error: `Unknown intent for file-ops domain: ${intent}`,
        duration: 0,
      };
    }

    const intentToOp: Record<string, Record<string, string>> = {
      "organize": { "organize-tool": "organize-execute", aifiles: "aifiles-organize" },
      "organize-preview": { "organize-tool": "organize-preview", aifiles: "aifiles-preview" },
      "ai-organize": { aifiles: "aifiles-organize", "organize-tool": "organize-execute" },
      "ai-organize-preview": { aifiles: "aifiles-preview", "organize-tool": "organize-preview" },
      "watch": { watchexec: "watchexec-watch" },
      "auto-organize": { watchexec: "watchexec-watch-organize" },
      "tag-files": { tagspaces: "tagspaces-tag-files" },
      "launch-tagger": { tagspaces: "tagspaces-launch" },
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
      error: `No installed file-ops tool available for intent: ${intent}. The built-in organizer should always be available.`,
      duration: 0,
    };
  },
};
