// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FolderOpen,
  File,
  ChevronRight,
  ArrowUp,
  Home,
  Copy,
  Check,
} from "lucide-react";
import { listFiles, readFile, type FileEntry } from "../services/api.js";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FilesPage() {
  const [currentPath, setCurrentPath] = useState("C:\\");
  const [viewingFile, setViewingFile] = useState<{
    path: string;
    content: string;
    size: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["files", currentPath],
    queryFn: () => listFiles(currentPath),
  });

  const handleNavigate = useCallback((entry: FileEntry) => {
    if (entry.type === "directory") {
      setCurrentPath(entry.path);
      setViewingFile(null);
    } else {
      readFile(entry.path).then(setViewingFile).catch(console.error);
    }
  }, []);

  const goUp = useCallback(() => {
    if (data?.parent) {
      setCurrentPath(data.parent);
      setViewingFile(null);
    }
  }, [data?.parent]);

  const copyContent = useCallback(async () => {
    if (!viewingFile) return;
    await navigator.clipboard.writeText(viewingFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [viewingFile]);

  const pathParts = currentPath.split(/[\\/]/).filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">Files</h1>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
        <button
          onClick={() => {
            setCurrentPath("C:\\");
            setViewingFile(null);
          }}
          className="rounded p-1 text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        >
          <Home size={14} />
        </button>
        {data?.parent && (
          <button
            onClick={goUp}
            className="rounded p-1 text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            <ArrowUp size={14} />
          </button>
        )}
        <div className="flex items-center gap-0.5 text-xs text-[var(--color-text-dim)]">
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight size={12} />}
              <span>{part}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File list */}
        <div
          className={`flex-1 overflow-y-auto ${viewingFile ? "hidden md:block md:w-1/2 md:border-r md:border-[var(--color-border)]" : ""}`}
        >
          {isLoading && (
            <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
              Loading...
            </div>
          )}

          {data?.entries.map((entry: FileEntry) => (
            <button
              key={entry.path}
              onClick={() => handleNavigate(entry)}
              className="flex w-full items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              {entry.type === "directory" ? (
                <FolderOpen
                  size={16}
                  className="shrink-0 text-[var(--color-accent)]"
                />
              ) : (
                <File
                  size={16}
                  className="shrink-0 text-[var(--color-text-dim)]"
                />
              )}
              <span className="flex-1 truncate">{entry.name}</span>
              <span className="text-xs text-[var(--color-text-dim)]">
                {entry.type === "file" ? formatSize(entry.size) : ""}
              </span>
              <span className="text-xs text-[var(--color-text-dim)]">
                {formatDate(entry.modified)}
              </span>
            </button>
          ))}

          {data?.entries.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
              Empty directory
            </div>
          )}
        </div>

        {/* File preview */}
        {viewingFile && (
          <div className="flex flex-1 flex-col md:w-1/2">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
              <div>
                <div className="text-sm font-medium">
                  {viewingFile.path.split(/[\\/]/).pop()}
                </div>
                <div className="text-xs text-[var(--color-text-dim)]">
                  {formatSize(viewingFile.size)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyContent}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => setViewingFile(null)}
                  className="rounded-lg px-2 py-1 text-xs text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto bg-black p-4 font-mono text-xs leading-5 text-[var(--color-text)]">
              {viewingFile.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
