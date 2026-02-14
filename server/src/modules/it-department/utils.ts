// Copyright 2025 #1 Future — Apache 2.0 License

import { exec } from "node:child_process";

export function execAsync(command: string, timeout = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export function powershell(command: string, timeout = 30_000): Promise<string> {
  const escaped = command.replace(/"/g, '\\"');
  return execAsync(`powershell -NoProfile -Command "${escaped}"`, timeout);
}
