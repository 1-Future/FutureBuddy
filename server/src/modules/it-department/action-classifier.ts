// Copyright 2025 #1 Future — Apache 2.0 License

import { randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import type { Action, ActionTier, ToolOperationRequest } from "@futurebuddy/shared";
import { execute } from "../../db/index.js";

// Patterns that indicate an IT action in AI responses
const ACTION_PATTERNS = [
  { regex: /```powershell\n([\s\S]*?)```/g, module: "powershell", tier: "yellow" as ActionTier },
  { regex: /```cmd\n([\s\S]*?)```/g, module: "cmd", tier: "yellow" as ActionTier },
  { regex: /```bash\n([\s\S]*?)```/g, module: "shell", tier: "yellow" as ActionTier },
];

// Pattern for structured tool operations
const TOOL_ACTION_PATTERN = /```futurebuddy-action\n([\s\S]*?)```/g;

// Commands that are always safe (green tier)
const GREEN_PATTERNS = [
  /^Get-/i,
  /^dir\b/i,
  /^ls\b/i,
  /^echo\b/i,
  /^type\b/i,
  /^cat\b/i,
  /^hostname/i,
  /^whoami/i,
  /^ipconfig/i,
  /^systeminfo/i,
  /^tasklist/i,
];

// Commands that require approval (red tier)
const RED_PATTERNS = [
  /\brm\b/i,
  /\bRemove-/i,
  /\bdel\b/i,
  /\bformat\b/i,
  /\bfdisk\b/i,
  /\bnet\s+user\b/i,
  /\bnetsh\b.*\breset\b/i,
  /\bregedit\b/i,
  /\bSet-ExecutionPolicy\b/i,
  /\bDisable-/i,
  /\bStop-Service\b/i,
  /\bUninstall-/i,
  /\breg\s+(add|delete)\b/i,
  /\bschtasks\b.*\b\/delete\b/i,
];

export function classifyTier(command: string): ActionTier {
  const trimmed = command.trim();

  for (const pattern of GREEN_PATTERNS) {
    if (pattern.test(trimmed)) return "green";
  }

  for (const pattern of RED_PATTERNS) {
    if (pattern.test(trimmed)) return "red";
  }

  return "yellow";
}

export function parseToolAction(json: string): ToolOperationRequest | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.domain || !parsed.intent) return null;
    return {
      domain: parsed.domain,
      intent: parsed.intent,
      params: parsed.params || {},
      tier: parsed.tier || "yellow",
      description: parsed.description || `Tool operation: ${parsed.domain}/${parsed.intent}`,
    };
  } catch {
    return null;
  }
}

export function classifyAndExtractActions(
  aiResponse: string,
  conversationId: string,
  db: Database,
): Action[] {
  const actions: Action[] = [];

  // Extract futurebuddy-action blocks (structured tool operations)
  TOOL_ACTION_PATTERN.lastIndex = 0;
  let toolMatch;
  while ((toolMatch = TOOL_ACTION_PATTERN.exec(aiResponse)) !== null) {
    const json = toolMatch[1].trim();
    if (!json) continue;

    const toolOp = parseToolAction(json);
    if (!toolOp) continue;

    const action: Action = {
      id: randomUUID(),
      tier: toolOp.tier,
      description: toolOp.description,
      command: json,
      module: "tool-operation",
      status: toolOp.tier === "green" ? "approved" : "pending",
      createdAt: new Date().toISOString(),
    };

    execute(
      db,
      "INSERT INTO actions (id, conversation_id, tier, description, command, module, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        action.id,
        conversationId,
        action.tier,
        action.description,
        action.command,
        action.module,
        action.status,
        action.createdAt,
      ],
    );

    actions.push(action);
  }

  // Extract shell code blocks (existing behavior)
  for (const pattern of ACTION_PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(aiResponse)) !== null) {
      const command = match[1].trim();
      if (!command) continue;

      const tier = classifyTier(command);
      const action: Action = {
        id: randomUUID(),
        tier,
        description: `Execute ${pattern.module} command`,
        command,
        module: pattern.module,
        status: tier === "green" ? "approved" : "pending",
        createdAt: new Date().toISOString(),
      };

      execute(
        db,
        "INSERT INTO actions (id, conversation_id, tier, description, command, module, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          action.id,
          conversationId,
          action.tier,
          action.description,
          action.command,
          action.module,
          action.status,
          action.createdAt,
        ],
      );

      actions.push(action);
    }
  }

  return actions;
}
