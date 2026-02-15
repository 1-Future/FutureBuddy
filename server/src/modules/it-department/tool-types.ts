// Copyright 2025 #1 Future — Apache 2.0 License

import type { ActionTier, ToolDomain, ToolOperationResult } from "@futurebuddy/shared";

export interface ToolStatus {
  installed: boolean;
  version?: string;
  path?: string;
}

export interface ToolOperation {
  id: string;
  name: string;
  description: string;
  tier: ActionTier;
  params: ToolParamDef[];
  execute: (params: Record<string, string>) => Promise<ToolOperationResult>;
}

export interface ToolParamDef {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

export interface ToolWrapper {
  id: string;
  name: string;
  description: string;
  domain: ToolDomain;
  installMethod?: string;
  installCommand?: string;

  detect(): Promise<ToolStatus>;
  getOperations(): ToolOperation[];
}

export interface DomainOrchestrator {
  domain: ToolDomain;
  name: string;
  description: string;

  /** Map of intent strings to ordered list of tool IDs to try */
  intentMap: Record<string, string[]>;

  getTools(): ToolWrapper[];

  /** Pick the best available tool for an intent and execute it */
  execute(
    intent: string,
    params: Record<string, string>,
    installedToolIds: Set<string>,
  ): Promise<ToolOperationResult>;
}
