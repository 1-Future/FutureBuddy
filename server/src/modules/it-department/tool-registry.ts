// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type { ToolDomain, ToolInfo, ToolOperationInfo, ToolOperationResult } from "@futurebuddy/shared";
import type { DomainOrchestrator } from "./tool-types.js";
import { execute, queryAll } from "../../db/index.js";

class ToolRegistry {
  private orchestrators = new Map<ToolDomain, DomainOrchestrator>();
  private toolCache = new Map<string, ToolInfo>();

  registerDomain(orchestrator: DomainOrchestrator): void {
    this.orchestrators.set(orchestrator.domain, orchestrator);
  }

  getDomains(): DomainOrchestrator[] {
    return [...this.orchestrators.values()];
  }

  getOrchestrator(domain: ToolDomain): DomainOrchestrator | undefined {
    return this.orchestrators.get(domain);
  }

  async scanTools(db: Database): Promise<ToolInfo[]> {
    const results: ToolInfo[] = [];

    for (const orchestrator of this.orchestrators.values()) {
      for (const tool of orchestrator.getTools()) {
        const status = await tool.detect();
        const info: ToolInfo = {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          domain: tool.domain,
          installed: status.installed,
          version: status.version,
          path: status.path,
          installMethod: tool.installMethod,
          lastChecked: new Date().toISOString(),
          capabilities: tool.getOperations().map((op) => op.name),
          installCommand: tool.installCommand,
        };

        // Upsert into DB
        execute(
          db,
          `INSERT INTO tools (id, name, description, domain, installed, version, path, install_method, last_checked, capabilities, install_command)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             installed = excluded.installed,
             version = excluded.version,
             path = excluded.path,
             last_checked = excluded.last_checked,
             capabilities = excluded.capabilities`,
          [
            info.id,
            info.name,
            info.description,
            info.domain,
            info.installed ? 1 : 0,
            info.version ?? null,
            info.path ?? null,
            info.installMethod ?? null,
            info.lastChecked!,
            JSON.stringify(info.capabilities),
            info.installCommand ?? null,
          ],
        );

        this.toolCache.set(tool.id, info);
        results.push(info);
      }
    }

    return results;
  }

  getInstalledTools(): ToolInfo[] {
    return [...this.toolCache.values()].filter((t) => t.installed);
  }

  getAllTools(): ToolInfo[] {
    return [...this.toolCache.values()];
  }

  getInstalledToolIds(): Set<string> {
    return new Set(this.getInstalledTools().map((t) => t.id));
  }

  getOperations(): ToolOperationInfo[] {
    const ops: ToolOperationInfo[] = [];
    const installedIds = this.getInstalledToolIds();

    for (const orchestrator of this.orchestrators.values()) {
      for (const tool of orchestrator.getTools()) {
        if (!installedIds.has(tool.id)) continue;
        for (const op of tool.getOperations()) {
          ops.push({
            id: op.id,
            toolId: tool.id,
            domain: tool.domain,
            name: op.name,
            description: op.description,
            tier: op.tier,
            params: op.params,
          });
        }
      }
    }

    return ops;
  }

  async executeIntent(
    domain: ToolDomain,
    intent: string,
    params: Record<string, string>,
    db: Database,
    actionId?: string,
  ): Promise<ToolOperationResult> {
    const orchestrator = this.orchestrators.get(domain);
    if (!orchestrator) {
      return { success: false, toolId: "unknown", error: `Unknown domain: ${domain}`, duration: 0 };
    }

    const installedIds = this.getInstalledToolIds();
    const startTime = Date.now();
    const result = await orchestrator.execute(intent, params, installedIds);
    const duration = Date.now() - startTime;

    // Log the operation
    execute(
      db,
      `INSERT INTO tool_operations_log (action_id, tool_id, domain, operation_id, params, success, output, error, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actionId ?? null,
        result.toolId,
        domain,
        intent,
        JSON.stringify(params),
        result.success ? 1 : 0,
        result.output ?? null,
        result.error ?? null,
        duration,
      ],
    );

    return result;
  }

  buildToolCapabilitiesSummary(): string {
    const installed = this.getInstalledTools();
    if (installed.length === 0) return "";

    const lines: string[] = [
      "\n\n## Available Tools",
      "You can use these tools by emitting a `futurebuddy-action` code block. Format:",
      '```futurebuddy-action\n{"domain":"<domain>","intent":"<intent>","params":{},"tier":"<green|yellow|red>","description":"<what this does>"}\n```',
      "",
    ];

    // Group by domain
    const byDomain = new Map<ToolDomain, ToolInfo[]>();
    for (const tool of installed) {
      const list = byDomain.get(tool.domain) || [];
      list.push(tool);
      byDomain.set(tool.domain, list);
    }

    for (const orchestrator of this.orchestrators.values()) {
      const tools = byDomain.get(orchestrator.domain);
      if (!tools || tools.length === 0) continue;

      lines.push(`### ${orchestrator.name}`);

      // List available intents
      for (const [intent, toolIds] of Object.entries(orchestrator.intentMap)) {
        // Only show intents that have at least one installed tool
        const available = toolIds.some((id) => this.toolCache.get(id)?.installed);
        if (!available) continue;
        lines.push(`- intent: \`${intent}\``);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /** Load cached tool info from DB (for fast startup after first scan) */
  loadFromDb(db: Database): void {
    const rows = queryAll(db, "SELECT * FROM tools");
    for (const row of rows) {
      const info: ToolInfo = {
        id: row.id,
        name: row.name,
        description: row.description,
        domain: row.domain as ToolDomain,
        installed: row.installed === 1,
        version: row.version ?? undefined,
        path: row.path ?? undefined,
        installMethod: row.install_method ?? undefined,
        lastChecked: row.last_checked ?? undefined,
        capabilities: JSON.parse(row.capabilities || "[]"),
        installCommand: row.install_command ?? undefined,
      };
      this.toolCache.set(info.id, info);
    }
  }
}

// Singleton
export const toolRegistry = new ToolRegistry();
