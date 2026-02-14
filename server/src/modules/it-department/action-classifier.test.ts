import { describe, it, expect, vi } from "vitest";

vi.mock("../../db/index.js", () => ({
  execute: vi.fn(),
}));

import { classifyTier, classifyAndExtractActions } from "./action-classifier.js";

describe("classifyTier", () => {
  it("classifies read-only commands as green", () => {
    const greenCommands = [
      "Get-Process",
      "Get-Service",
      "dir C:\\Users",
      "ls -la",
      "echo hello",
      "type file.txt",
      "cat readme.md",
      "hostname",
      "whoami",
      "ipconfig /all",
      "systeminfo",
      "tasklist",
    ];
    for (const cmd of greenCommands) {
      expect(classifyTier(cmd), `Expected "${cmd}" to be green`).toBe("green");
    }
  });

  it("classifies destructive commands as red", () => {
    const redCommands = [
      "Remove-Item C:\\temp",
      "rm -rf /tmp",
      "del file.txt",
      "format C:",
      "fdisk /dev/sda",
      "net user admin password",
      "netsh winsock reset",
      "regedit",
      "Set-ExecutionPolicy Unrestricted",
      "Disable-WindowsOptionalFeature",
      "Stop-Service wuauserv",
      "Uninstall-Package foo",
      "reg add HKLM\\Software",
      "reg delete HKLM\\Software",
    ];
    for (const cmd of redCommands) {
      expect(classifyTier(cmd), `Expected "${cmd}" to be red`).toBe("red");
    }
  });

  it("classifies unknown commands as yellow", () => {
    const yellowCommands = ["npm install express", "choco install firefox", "ping 8.8.8.8"];
    for (const cmd of yellowCommands) {
      expect(classifyTier(cmd), `Expected "${cmd}" to be yellow`).toBe("yellow");
    }
  });
});

describe("classifyAndExtractActions", () => {
  const mockDb = {} as any;

  it("extracts powershell code blocks", () => {
    const response = "Here's a command:\n```powershell\nGet-Process\n```";
    const actions = classifyAndExtractActions(response, "conv-1", mockDb);

    expect(actions).toHaveLength(1);
    expect(actions[0].command).toBe("Get-Process");
    expect(actions[0].module).toBe("powershell");
    expect(actions[0].tier).toBe("green");
    expect(actions[0].status).toBe("approved");
  });

  it("extracts cmd code blocks", () => {
    const response = "Run this:\n```cmd\ndir C:\\Users\n```";
    const actions = classifyAndExtractActions(response, "conv-1", mockDb);

    expect(actions).toHaveLength(1);
    expect(actions[0].module).toBe("cmd");
    expect(actions[0].tier).toBe("green");
  });

  it("extracts bash code blocks", () => {
    const response = "Try:\n```bash\nnpm install express\n```";
    const actions = classifyAndExtractActions(response, "conv-1", mockDb);

    expect(actions).toHaveLength(1);
    expect(actions[0].module).toBe("shell");
    expect(actions[0].tier).toBe("yellow");
    expect(actions[0].status).toBe("pending");
  });

  it("extracts multiple code blocks from one response", () => {
    const response = [
      "Step 1:\n```powershell\nGet-Service\n```",
      "Step 2:\n```bash\nnpm install\n```",
    ].join("\n");

    const actions = classifyAndExtractActions(response, "conv-1", mockDb);
    expect(actions).toHaveLength(2);
  });

  it("skips empty code blocks", () => {
    const response = "Empty:\n```powershell\n\n```";
    const actions = classifyAndExtractActions(response, "conv-1", mockDb);
    expect(actions).toHaveLength(0);
  });

  it("sets red tier actions to pending status", () => {
    const response = "Danger:\n```powershell\nRemove-Item C:\\temp -Recurse\n```";
    const actions = classifyAndExtractActions(response, "conv-1", mockDb);

    expect(actions).toHaveLength(1);
    expect(actions[0].tier).toBe("red");
    expect(actions[0].status).toBe("pending");
  });
});
