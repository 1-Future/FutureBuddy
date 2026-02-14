// Copyright 2025 #1 Future — Apache 2.0 License

import { randomUUID } from "node:crypto";
import type { TerminalSession, TerminalCreate } from "@futurebuddy/shared";

// node-pty is a native module — we'll import it dynamically to handle cases where it's not installed
let pty: any;

async function getPty() {
  if (!pty) {
    try {
      pty = await import("node-pty");
    } catch {
      throw new Error(
        "node-pty is not installed. Run: npm install node-pty (requires build tools)",
      );
    }
  }
  return pty;
}

type OutputCallback = (sessionId: string, data: string) => void;

export class TerminalManager {
  private sessions = new Map<string, { process: any; info: TerminalSession }>();
  private outputListeners = new Set<OutputCallback>();

  async create(options: TerminalCreate = {}): Promise<TerminalSession> {
    const nodePty = await getPty();
    const id = randomUUID();
    const shell = options.shell || (process.platform === "win32" ? "powershell.exe" : "bash");
    const cols = options.cols || 120;
    const rows = options.rows || 30;

    const proc = nodePty.spawn(shell, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd: process.env.USERPROFILE || process.env.HOME || "C:\\",
      env: process.env as Record<string, string>,
    });

    const info: TerminalSession = {
      id,
      pid: proc.pid,
      createdAt: new Date().toISOString(),
    };

    proc.onData((data: string) => {
      for (const listener of this.outputListeners) {
        listener(id, data);
      }
    });

    proc.onExit(() => {
      this.sessions.delete(id);
    });

    this.sessions.set(id, { process: proc, info });
    return info;
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.process.write(data);
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.process.resize(cols, rows);
    }
  }

  kill(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.process.kill();
    this.sessions.delete(sessionId);
    return true;
  }

  list(): TerminalSession[] {
    return Array.from(this.sessions.values()).map((s) => s.info);
  }

  onOutput(callback: OutputCallback): void {
    this.outputListeners.add(callback);
  }

  offOutput(callback: OutputCallback): void {
    this.outputListeners.delete(callback);
  }

  killAll(): void {
    for (const [id] of this.sessions) {
      this.kill(id);
    }
  }
}
