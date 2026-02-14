// Copyright 2025 #1 Future — Apache 2.0 License

export interface OllamaModel {
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

export interface OllamaModelInfo {
  name: string;
  description: string;
  size: number;
  parameterSize: string;
  quantizationLevel: string;
  family: string;
  isInstalled: boolean;
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface ModelBenchmark {
  model: string;
  tokensPerSecond: number;
  promptEvalDuration: number;
  evalDuration: number;
  totalDuration: number;
}

export class OllamaManager {
  constructor(private baseUrl: string = "http://localhost:11434") {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = (await res.json()) as { models: OllamaModel[] };
    return data.models || [];
  }

  async getModelInfo(name: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    return res.json();
  }

  async pullModel(
    name: string,
    onProgress?: (progress: PullProgress) => void,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: !!onProgress }),
    });

    if (!res.ok) throw new Error(`Pull error: ${res.status}`);

    if (onProgress && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            onProgress(JSON.parse(line));
          } catch {
            // skip malformed
          }
        }
      }
    }
  }

  async deleteModel(name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Delete error: ${res.status}`);
  }

  async benchmark(model: string): Promise<ModelBenchmark> {
    const prompt = "Explain what a hash table is in one paragraph.";
    const start = Date.now();

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
    });

    if (!res.ok) throw new Error(`Benchmark error: ${res.status}`);

    const data = (await res.json()) as {
      total_duration: number;
      prompt_eval_duration: number;
      eval_duration: number;
      eval_count: number;
    };

    const totalDuration = Date.now() - start;
    const tokensPerSecond =
      data.eval_duration > 0
        ? (data.eval_count / data.eval_duration) * 1e9
        : 0;

    return {
      model,
      tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
      promptEvalDuration: Math.round(data.prompt_eval_duration / 1e6),
      evalDuration: Math.round(data.eval_duration / 1e6),
      totalDuration,
    };
  }

  async getRunningModels(): Promise<
    { name: string; size: number; expiresAt: string }[]
  > {
    const res = await fetch(`${this.baseUrl}/api/ps`);
    if (!res.ok) throw new Error(`PS error: ${res.status}`);
    const data = (await res.json()) as {
      models: { name: string; size: number; expires_at: string }[];
    };
    return (data.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      expiresAt: m.expires_at,
    }));
  }
}
