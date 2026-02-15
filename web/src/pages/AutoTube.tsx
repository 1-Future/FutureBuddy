// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Play,
  FileText,
  Trash2,
  Check,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Loader2,
} from "lucide-react";
import {
  getAutoTubeProjects,
  createAutoTubeProject,
  generateAutoTubeScript,
  approveAutoTubeProject,
  deleteAutoTubeProject,
  type AutoTubeProject,
} from "../services/api.js";

// ── Status badge ──────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "text-gray-400 bg-gray-400/10",
  scripted: "text-blue-400 bg-blue-400/10",
  approved: "text-emerald-400 bg-emerald-400/10",
  rendering: "text-amber-400 bg-amber-400/10",
  published: "text-purple-400 bg-purple-400/10",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[status] || "text-gray-400 bg-gray-400/10"}`}
    >
      {status}
    </span>
  );
}

// ── Script preview ────────────────────────────────────────────────────

interface TutorialScript {
  title: string;
  description: string;
  scenes: { narration: string; codeBlock?: string; duration: number }[];
  estimatedDuration: number;
}

function ScriptPreview({ scriptJson }: { scriptJson: string }) {
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());

  let script: TutorialScript;
  try {
    script = JSON.parse(scriptJson) as TutorialScript;
  } catch {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm text-[var(--color-text-dim)]">
        Unable to parse script data.
      </div>
    );
  }

  const toggleScene = (index: number) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Script header */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
        <h3 className="text-sm font-semibold">{script.title}</h3>
        <p className="mt-1 text-xs text-[var(--color-text-dim)]">
          {script.description}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(script.estimatedDuration)}
          </span>
          <span className="flex items-center gap-1">
            <FileText size={12} />
            {script.scenes.length} scenes
          </span>
        </div>
      </div>

      {/* Scenes */}
      {script.scenes.map((scene, i) => {
        const expanded = expandedScenes.has(i);
        return (
          <div
            key={i}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
          >
            <button
              onClick={() => toggleScene(i)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)]"
            >
              {expanded ? (
                <ChevronDown size={14} className="shrink-0 text-[var(--color-text-dim)]" />
              ) : (
                <ChevronRight size={14} className="shrink-0 text-[var(--color-text-dim)]" />
              )}
              <span className="flex-1 font-medium">Scene {i + 1}</span>
              <span className="text-xs text-[var(--color-text-dim)]">
                {formatDuration(scene.duration)}
              </span>
            </button>

            {expanded && (
              <div className="border-t border-[var(--color-border)] px-3 pb-3 pt-2">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-text-dim)]">
                  {scene.narration}
                </p>
                {scene.codeBlock && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 pb-1 text-[10px] text-[var(--color-text-dim)]">
                      <Code size={10} />
                      Code
                    </div>
                    <pre className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs">
                      <code>{scene.codeBlock}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export function AutoTubePage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [sessionPath, setSessionPath] = useState("");
  const [scriptPath, setScriptPath] = useState("");
  const [scriptProjectId, setScriptProjectId] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["autotube-projects"],
    queryFn: getAutoTubeProjects,
  });

  const createMutation = useMutation({
    mutationFn: () => createAutoTubeProject(sessionPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autotube-projects"] });
      setShowCreate(false);
      setSessionPath("");
    },
  });

  const scriptMutation = useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) =>
      generateAutoTubeScript(id, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autotube-projects"] });
      setScriptProjectId("");
      setScriptPath("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveAutoTubeProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autotube-projects"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutoTubeProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autotube-projects"] });
    },
  });

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (sessionPath.trim()) createMutation.mutate();
    },
    [sessionPath, createMutation],
  );

  const handleGenerateScript = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (scriptProjectId && scriptPath.trim()) {
        scriptMutation.mutate({ id: scriptProjectId, path: scriptPath });
      }
    },
    [scriptProjectId, scriptPath, scriptMutation],
  );

  const projectList: AutoTubeProject[] = projects || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Video size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">AutoTube</h1>
          <span className="text-xs text-[var(--color-text-dim)]">
            {projectList.length} project{projectList.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <Plus size={14} />
          Create from Session
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-dim)]">
            Session file path (.jsonl)
          </label>
          <input
            value={sessionPath}
            onChange={(e) => setSessionPath(e.target.value)}
            placeholder="C:\Users\...\.claude\projects\...\session.jsonl"
            className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-text-dim)]"
            >
              Cancel
            </button>
          </div>
          {createMutation.isError && (
            <p className="mt-2 text-xs text-[var(--color-red)]">
              Failed to create project. Check the session path.
            </p>
          )}
        </form>
      )}

      {/* Script generation modal (inline) */}
      {scriptProjectId && (
        <form
          onSubmit={handleGenerateScript}
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <Play size={14} className="text-[var(--color-accent)]" />
            <span className="text-xs font-medium">Generate Script</span>
          </div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-dim)]">
            Session file path (for script generation)
          </label>
          <input
            value={scriptPath}
            onChange={(e) => setScriptPath(e.target.value)}
            placeholder="C:\Users\...\.claude\projects\...\session.jsonl"
            className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={scriptMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {scriptMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {scriptMutation.isPending ? "Generating..." : "Generate"}
            </button>
            <button
              type="button"
              onClick={() => {
                setScriptProjectId("");
                setScriptPath("");
              }}
              className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-text-dim)]"
            >
              Cancel
            </button>
          </div>
          {scriptMutation.isError && (
            <p className="mt-2 text-xs text-[var(--color-red)]">
              Script generation failed. Is the AI provider configured?
            </p>
          )}
        </form>
      )}

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Loading...
          </div>
        )}

        {projectList.map((project) => {
          const isExpanded = expandedProject === project.id;
          return (
            <div
              key={project.id}
              className="border-b border-[var(--color-border)]"
            >
              {/* Project row */}
              <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]">
                {/* Expand toggle */}
                <button
                  onClick={() =>
                    setExpandedProject(isExpanded ? null : project.id)
                  }
                  className="shrink-0 text-[var(--color-text-dim)]"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>

                {/* Icon */}
                <Video
                  size={16}
                  className="shrink-0 text-[var(--color-accent)]"
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {project.title || "Untitled Project"}
                  </div>
                  <div className="truncate text-xs text-[var(--color-text-dim)]">
                    {project.description || "No description"}
                  </div>
                </div>

                {/* Status */}
                <StatusBadge status={project.status} />

                {/* Date */}
                <span className="shrink-0 text-[10px] text-[var(--color-text-dim)]">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {project.status === "draft" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setScriptProjectId(project.id);
                        setScriptPath("");
                      }}
                      title="Generate Script"
                      className="rounded-lg p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
                    >
                      <Play size={14} />
                    </button>
                  )}
                  {project.status === "scripted" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        approveMutation.mutate(project.id);
                      }}
                      title="Approve"
                      className="rounded-lg p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-green)]"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(project.id);
                    }}
                    title="Delete"
                    className="rounded-lg p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-red)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                  <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--color-text-dim)]">
                        Session ID:{" "}
                      </span>
                      <span className="font-mono">{project.session_id}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-dim)]">
                        Status:{" "}
                      </span>
                      <StatusBadge status={project.status} />
                    </div>
                    <div>
                      <span className="text-[var(--color-text-dim)]">
                        Created:{" "}
                      </span>
                      {new Date(project.created_at).toLocaleString()}
                    </div>
                    <div>
                      <span className="text-[var(--color-text-dim)]">
                        Updated:{" "}
                      </span>
                      {new Date(project.updated_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Script preview */}
                  {project.script && <ScriptPreview scriptJson={project.script} />}

                  {!project.script && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] p-4 text-xs text-[var(--color-text-dim)]">
                      <FileText size={16} />
                      No script generated yet. Click the Play button to generate
                      one.
                    </div>
                  )}

                  {/* Action buttons in expanded view */}
                  <div className="mt-3 flex gap-2">
                    {project.status === "draft" && (
                      <button
                        onClick={() => {
                          setScriptProjectId(project.id);
                          setScriptPath("");
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)]"
                      >
                        <Play size={12} />
                        Generate Script
                      </button>
                    )}
                    {project.status === "scripted" && (
                      <button
                        onClick={() => approveMutation.mutate(project.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        <Check size={12} />
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(project.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-dim)] hover:text-[var(--color-red)]"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {projectList.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 p-8 text-[var(--color-text-dim)]">
            <Video size={48} strokeWidth={1} />
            <p className="text-sm">
              No AutoTube projects yet. Create one from a coding session.
            </p>
            <p className="text-xs">
              Sessions are automatically scrubbed of sensitive data before script
              generation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
