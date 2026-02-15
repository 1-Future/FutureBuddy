// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type { Action } from "@futurebuddy/shared";
import { execAsync, powershell } from "./utils.js";
import { parseToolAction } from "./action-classifier.js";
import { toolRegistry } from "./tool-registry.js";

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export async function executeAction(action: Action, db?: Database): Promise<ExecutionResult> {
  try {
    // Handle structured tool operations
    if (action.module === "tool-operation") {
      if (!db) {
        return { success: false, error: "Database required for tool operations" };
      }

      const toolOp = parseToolAction(action.command);
      if (!toolOp) {
        return { success: false, error: "Invalid tool operation JSON" };
      }

      const result = await toolRegistry.executeIntent(
        toolOp.domain,
        toolOp.intent,
        toolOp.params,
        db,
        action.id,
      );

      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    }

    // Handle shell code blocks (existing behavior)
    let output: string;

    switch (action.module) {
      case "powershell":
        output = await powershell(action.command);
        break;
      case "cmd":
        output = await execAsync(`cmd /c ${action.command}`);
        break;
      case "shell":
        output = await execAsync(action.command);
        break;
      default:
        return { success: false, error: `Unknown module: ${action.module}` };
    }

    return { success: true, output };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
