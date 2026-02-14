// Copyright 2025 #1 Future — Apache 2.0 License

import type { Action } from "@futurebuddy/shared";
import { execAsync, powershell } from "./utils.js";

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export async function executeAction(action: Action): Promise<ExecutionResult> {
  try {
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
