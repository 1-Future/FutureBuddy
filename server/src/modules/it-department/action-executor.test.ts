import { describe, it, expect, vi } from "vitest";
import type { Action } from "@futurebuddy/shared";

const { mockExecAsync, mockPowershell } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
  mockPowershell: vi.fn(),
}));

vi.mock("./utils.js", () => ({
  execAsync: mockExecAsync,
  powershell: mockPowershell,
}));

import { executeAction } from "./action-executor.js";

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "test-id",
    tier: "green",
    description: "Test action",
    command: "echo hello",
    module: "shell",
    status: "approved",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("executeAction", () => {
  it("routes powershell commands to powershell()", async () => {
    mockPowershell.mockResolvedValue("output");
    const result = await executeAction(
      makeAction({ module: "powershell", command: "Get-Process" }),
    );

    expect(result).toEqual({ success: true, output: "output" });
    expect(mockPowershell).toHaveBeenCalledWith("Get-Process");
  });

  it("routes cmd commands to execAsync with cmd /c prefix", async () => {
    mockExecAsync.mockResolvedValue("dir output");
    const result = await executeAction(makeAction({ module: "cmd", command: "dir C:\\" }));

    expect(result).toEqual({ success: true, output: "dir output" });
    expect(mockExecAsync).toHaveBeenCalledWith("cmd /c dir C:\\");
  });

  it("routes shell commands to execAsync directly", async () => {
    mockExecAsync.mockResolvedValue("shell output");
    const result = await executeAction(makeAction({ module: "shell", command: "ls -la" }));

    expect(result).toEqual({ success: true, output: "shell output" });
    expect(mockExecAsync).toHaveBeenCalledWith("ls -la");
  });

  it("returns error for unknown module", async () => {
    const result = await executeAction(makeAction({ module: "unknown" }));

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown module");
  });

  it("catches exceptions and returns failure", async () => {
    mockExecAsync.mockRejectedValue(new Error("Command timed out"));
    const result = await executeAction(makeAction({ module: "shell", command: "sleep 60" }));

    expect(result).toEqual({ success: false, error: "Command timed out" });
  });
});
