// Copyright 2025 #1 Future — Apache 2.0 License

import { useQuery } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Shield,
  Server,
} from "lucide-react";
import {
  getServerInfo,
  getSystemStatus,
  getSecurityScan,
} from "../services/api.js";

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function SettingsPage() {
  const { data: serverInfo } = useQuery({
    queryKey: ["server-info"],
    queryFn: getServerInfo,
  });

  const { data: status } = useQuery({
    queryKey: ["system-status"],
    queryFn: getSystemStatus,
  });

  const { data: security } = useQuery({
    queryKey: ["security-scan"],
    queryFn: getSecurityScan,
    staleTime: 60_000,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <SettingsIcon size={18} className="text-[var(--color-accent)]" />
        <h1 className="text-sm font-semibold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Server info */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Server size={16} className="text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold">Server</h2>
            </div>
            {serverInfo ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Name
                  </span>
                  <p>{serverInfo.name}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Version
                  </span>
                  <p>{serverInfo.version}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Status
                  </span>
                  <p className="capitalize text-[var(--color-green)]">
                    {serverInfo.status}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Uptime
                  </span>
                  <p>{formatUptime(serverInfo.uptime)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-dim)]">Loading...</p>
            )}
          </section>

          {/* System status */}
          {status && (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Cpu size={16} className="text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold">System</h2>
              </div>
              <div className="space-y-4">
                {/* CPU */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-dim)]">
                      <Cpu size={12} />
                      {status.cpu.model} ({status.cpu.cores} cores)
                    </span>
                    <span>{status.cpu.usage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                      style={{ width: `${status.cpu.usage}%` }}
                    />
                  </div>
                </div>

                {/* Memory */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-dim)]">
                      <MemoryStick size={12} />
                      RAM
                    </span>
                    <span>
                      {formatBytes(status.memory.used)} /{" "}
                      {formatBytes(status.memory.total)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-bg)]">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{
                        width: `${(status.memory.used / status.memory.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Disks */}
                {status.disk.map((d) => (
                  <div key={d.mount}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[var(--color-text-dim)]">
                        <HardDrive size={12} />
                        {d.label || d.mount}
                      </span>
                      <span>
                        {formatBytes(d.used)} / {formatBytes(d.total)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-bg)]">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{
                          width: `${(d.used / d.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {/* Network */}
                {status.network.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-[var(--color-text-dim)]">
                      <Wifi size={12} />
                      Network
                    </div>
                    <div className="space-y-1">
                      {status.network.map((n) => (
                        <div
                          key={n.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-[var(--color-text-dim)]">
                            {n.name}
                          </span>
                          <span className="font-mono">{n.ip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Security */}
          {security && (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Shield size={16} className="text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold">Security</h2>
                <span
                  className={`ml-auto text-sm font-bold ${
                    security.score >= 80
                      ? "text-[var(--color-green)]"
                      : security.score >= 50
                        ? "text-[var(--color-yellow)]"
                        : "text-[var(--color-red)]"
                  }`}
                >
                  {security.score}/100
                </span>
              </div>
              {security.issues.length > 0 ? (
                <div className="space-y-2">
                  {security.issues.map((issue, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-[var(--color-bg)] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            issue.severity === "critical" ||
                            issue.severity === "high"
                              ? "bg-[var(--color-red)]/10 text-[var(--color-red)]"
                              : issue.severity === "medium"
                                ? "bg-[var(--color-yellow)]/10 text-[var(--color-yellow)]"
                                : "bg-[var(--color-text-dim)]/10 text-[var(--color-text-dim)]"
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs text-[var(--color-text-dim)]">
                          {issue.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs">{issue.description}</p>
                      <p className="mt-1 text-xs text-[var(--color-accent)]">
                        {issue.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-green)]">
                  All clear — no issues detected.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
