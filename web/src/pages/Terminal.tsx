// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, Terminal as TerminalIcon } from "lucide-react";
import { createTerminal, getTerminalSessions, killTerminal } from "../services/api.js";
import { ws } from "../services/websocket.js";

interface Session {
  id: string;
  pid: number;
  createdAt: string;
}

export function TerminalPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [output, setOutput] = useState<Map<string, string>>(new Map());
  const [inputValue, setInputValue] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  // Connect WebSocket and load sessions
  useEffect(() => {
    ws.connect();
    getTerminalSessions().then(setSessions).catch(() => {});

    const unsub = ws.on("terminal:data", (msg: any) => {
      const { sessionId, payload } = msg;
      if (sessionId && payload?.data) {
        setOutput((prev) => {
          const next = new Map(prev);
          next.set(sessionId, (next.get(sessionId) || "") + payload.data);
          return next;
        });
      }
    });

    return unsub;
  }, []);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, activeSession]);

  const handleCreate = useCallback(async () => {
    try {
      const session = await createTerminal(120, 30);
      setSessions((prev) => [...prev, session]);
      setActiveSession(session.id);
    } catch (err) {
      console.error("Failed to create terminal:", err);
    }
  }, []);

  const handleKill = useCallback(async (id: string) => {
    try {
      await killTerminal(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActiveSession((prev) => (prev === id ? null : prev));
      setOutput((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Failed to kill terminal:", err);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!activeSession || !inputValue) return;
    ws.send("terminal:data", { data: inputValue + "\r" }, activeSession);
    setInputValue("");
  }, [activeSession, inputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <TerminalIcon size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">Terminal</h1>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <Plus size={14} />
          New Session
        </button>
      </div>

      {/* Session tabs */}
      {sessions.length > 0 && (
        <div className="flex gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs transition-colors ${
                s.id === activeSession
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <button
                onClick={() => setActiveSession(s.id)}
                className="font-mono"
              >
                PID {s.pid}
              </button>
              <button
                onClick={() => handleKill(s.id)}
                className="text-[var(--color-text-dim)] opacity-0 transition-opacity hover:text-[var(--color-red)] group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Terminal output */}
      <div className="flex-1 overflow-hidden bg-black p-0">
        {activeSession ? (
          <pre
            ref={outputRef}
            className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-green-400"
          >
            {output.get(activeSession) || ""}
          </pre>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--color-text-dim)]">
            <TerminalIcon size={48} strokeWidth={1} />
            <p className="text-sm">
              Create a new terminal session to get started
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      {activeSession && (
        <div className="border-t border-[var(--color-border)] bg-black px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-green-400">$</span>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              className="flex-1 bg-transparent font-mono text-xs text-green-400 outline-none placeholder:text-green-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}
