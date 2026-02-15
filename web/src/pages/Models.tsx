// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  Download,
  Trash2,
  Zap,
  Play,
  Loader2,
  Server,
} from "lucide-react";

const BASE = "/api";

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
  details: {
    format: string;
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

interface RunningModel {
  name: string;
  size: number;
  expiresAt: string;
}

interface BenchmarkResult {
  model: string;
  tokensPerSecond: number;
  promptEvalDuration: number;
  evalDuration: number;
  totalDuration: number;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function ModelsPage() {
  const queryClient = useQueryClient();
  const [pullName, setPullName] = useState("");
  const [pullStatus, setPullStatus] = useState("");
  const [isPulling, setIsPulling] = useState(false);
  const [benchResult, setBenchResult] = useState<BenchmarkResult | null>(null);
  const [benchingModel, setBenchingModel] = useState<string | null>(null);

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/models`);
      return res.json() as Promise<{
        models: OllamaModel[];
        error?: string;
      }>;
    },
    refetchInterval: 10000,
  });

  const { data: runningData } = useQuery({
    queryKey: ["models-running"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/models/running`);
      return res.json() as Promise<{
        models: RunningModel[];
      }>;
    },
    refetchInterval: 5000,
  });

  const { data: statusData } = useQuery({
    queryKey: ["models-status"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/models/status`);
      return res.json() as Promise<{
        ollama: string;
        baseUrl: string;
      }>;
    },
  });

  const { data: providersData } = useQuery({
    queryKey: ["models-providers"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/models/providers`);
      return res.json() as Promise<{
        current: string;
        currentModel: string;
        providers: string[];
      }>;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${BASE}/models/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });

  const handlePull = useCallback(async () => {
    if (!pullName.trim() || isPulling) return;
    setIsPulling(true);
    setPullStatus("Starting download...");

    try {
      const res = await fetch(`${BASE}/models/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pullName.trim() }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setPullStatus("Download complete!");
              queryClient.invalidateQueries({ queryKey: ["models"] });
            } else if (data.total && data.completed) {
              const pct = Math.round((data.completed / data.total) * 100);
              setPullStatus(`${data.status}: ${pct}%`);
            } else if (data.status) {
              setPullStatus(data.status);
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setPullStatus(`Error: ${err}`);
    } finally {
      setIsPulling(false);
      setPullName("");
    }
  }, [pullName, isPulling, queryClient]);

  const handleBenchmark = useCallback(async (name: string) => {
    setBenchingModel(name);
    setBenchResult(null);
    try {
      const res = await fetch(`${BASE}/models/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = (await res.json()) as BenchmarkResult;
      setBenchResult(result);
    } catch {
      setBenchResult(null);
    } finally {
      setBenchingModel(null);
    }
  }, []);

  const models = modelsData?.models || [];
  const running = runningData?.models || [];
  const runningNames = new Set(running.map((r) => r.name));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Cpu size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">AI Models</h1>
          {statusData && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                statusData.ollama === "running"
                  ? "bg-[var(--color-green)]/10 text-[var(--color-green)]"
                  : "bg-[var(--color-red)]/10 text-[var(--color-red)]"
              }`}
            >
              Ollama {statusData.ollama}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Current provider */}
          {providersData && (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Server size={16} className="text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold">Active Provider</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-[var(--color-accent)]/15 px-3 py-1 text-sm font-medium text-[var(--color-accent)]">
                  {providersData.current}
                </span>
                <span className="text-xs text-[var(--color-text-dim)]">
                  Model: {providersData.currentModel}
                </span>
              </div>
              {providersData.providers.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {providersData.providers.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-[var(--color-green)]/10 px-2 py-0.5 text-[10px] text-[var(--color-green)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Pull model */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Download size={16} className="text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold">Download Model</h2>
            </div>
            <div className="flex gap-2">
              <input
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                placeholder="Model name (e.g. llama3.2, mistral, gemma2)"
                disabled={isPulling}
                onKeyDown={(e) => e.key === "Enter" && handlePull()}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              <button
                onClick={handlePull}
                disabled={isPulling || !pullName.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
              >
                {isPulling ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Pull
              </button>
            </div>
            {pullStatus && (
              <p className="mt-2 text-xs text-[var(--color-text-dim)]">
                {pullStatus}
              </p>
            )}
          </section>

          {/* Benchmark result */}
          {benchResult && (
            <section className="rounded-xl border border-[var(--color-green)]/30 bg-[var(--color-green)]/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Zap size={16} className="text-[var(--color-green)]" />
                <h2 className="text-sm font-semibold">
                  Benchmark: {benchResult.model}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Tokens/sec
                  </span>
                  <p className="text-lg font-bold text-[var(--color-green)]">
                    {benchResult.tokensPerSecond}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Total time
                  </span>
                  <p>{(benchResult.totalDuration / 1000).toFixed(1)}s</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Prompt eval
                  </span>
                  <p>{(benchResult.promptEvalDuration / 1000).toFixed(1)}s</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-dim)]">
                    Generation
                  </span>
                  <p>{(benchResult.evalDuration / 1000).toFixed(1)}s</p>
                </div>
              </div>
            </section>
          )}

          {/* Installed models */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-[var(--color-text)]">
              Installed Models ({models.length})
            </h2>
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.digest}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{model.name}</span>
                      {runningNames.has(model.name) && (
                        <span className="flex items-center gap-1 rounded-full bg-[var(--color-green)]/10 px-2 py-0.5 text-[10px] text-[var(--color-green)]">
                          <Play size={8} fill="currentColor" />
                          Running
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-text-dim)]">
                      <span>{formatSize(model.size)}</span>
                      <span>{model.details.family}</span>
                      <span>{model.details.parameterSize}</span>
                      <span>{model.details.quantizationLevel}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleBenchmark(model.name)}
                      disabled={benchingModel === model.name}
                      className="rounded-lg p-2 text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-accent)]"
                      title="Benchmark"
                    >
                      {benchingModel === model.name ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(model.name)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg p-2 text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-red)]"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {models.length === 0 && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-[var(--color-text-dim)]">
                  <Cpu size={48} strokeWidth={1} />
                  <p className="text-sm">
                    {statusData?.ollama === "running"
                      ? "No models installed. Download one above to get started."
                      : "Ollama is not running. Start it to manage models."}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
