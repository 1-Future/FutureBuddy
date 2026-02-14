// Copyright 2025 #1 Future — Apache 2.0 License

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  getActions,
  getPendingActions,
  resolveAction,
  type Action,
} from "../services/api.js";

const TIER_STYLES = {
  green: {
    bg: "bg-[var(--color-green)]/10",
    text: "text-[var(--color-green)]",
    border: "border-[var(--color-green)]/30",
    label: "Safe",
  },
  yellow: {
    bg: "bg-[var(--color-yellow)]/10",
    text: "text-[var(--color-yellow)]",
    border: "border-[var(--color-yellow)]/30",
    label: "Caution",
  },
  red: {
    bg: "bg-[var(--color-red)]/10",
    text: "text-[var(--color-red)]",
    border: "border-[var(--color-red)]/30",
    label: "Dangerous",
  },
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  denied: XCircle,
  executed: CheckCircle,
  failed: AlertTriangle,
};

export function ActionsPage() {
  const queryClient = useQueryClient();

  const { data: pending } = useQuery({
    queryKey: ["actions", "pending"],
    queryFn: getPendingActions,
    refetchInterval: 5000,
  });

  const { data: allActions } = useQuery({
    queryKey: ["actions", "all"],
    queryFn: () => getActions(undefined, 50),
  });

  const resolve = useMutation({
    mutationFn: ({
      id,
      approved,
    }: {
      id: string;
      approved: boolean;
    }) => resolveAction(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });

  const pendingCount = pending?.length || 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <Shield size={18} className="text-[var(--color-accent)]" />
        <h1 className="text-sm font-semibold">Actions</h1>
        {pendingCount > 0 && (
          <span className="rounded-full bg-[var(--color-red)] px-2 py-0.5 text-xs font-medium text-white">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Pending actions */}
        {pending && pending.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-[var(--color-text)]">
              Awaiting Approval
            </h2>
            <div className="space-y-3">
              {pending.map((action: Action) => {
                const tier = TIER_STYLES[action.tier];
                return (
                  <div
                    key={action.id}
                    className={`rounded-xl border ${tier.border} ${tier.bg} p-4`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${tier.text} ${tier.bg}`}
                      >
                        {tier.label}
                      </span>
                      <span className="text-xs text-[var(--color-text-dim)]">
                        {action.module}
                      </span>
                    </div>
                    <p className="mb-2 text-sm">{action.description}</p>
                    <pre className="mb-3 overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-xs text-[var(--color-text)]">
                      {action.command}
                    </pre>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          resolve.mutate({
                            id: action.id,
                            approved: true,
                          })
                        }
                        disabled={resolve.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--color-green)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-green)]/80"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          resolve.mutate({
                            id: action.id,
                            approved: false,
                          })
                        }
                        disabled={resolve.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--color-red)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-red)]/80"
                      >
                        <XCircle size={14} />
                        Deny
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action history */}
        <h2 className="mb-3 text-sm font-medium text-[var(--color-text)]">
          History
        </h2>
        <div className="space-y-2">
          {allActions?.map((action: Action) => {
            const tier = TIER_STYLES[action.tier];
            const StatusIcon =
              STATUS_ICONS[action.status] || Clock;
            return (
              <div
                key={action.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon
                    size={14}
                    className={
                      action.status === "executed"
                        ? "text-[var(--color-green)]"
                        : action.status === "failed" ||
                            action.status === "denied"
                          ? "text-[var(--color-red)]"
                          : "text-[var(--color-text-dim)]"
                    }
                  />
                  <span
                    className={`text-xs font-medium ${tier.text}`}
                  >
                    {tier.label}
                  </span>
                  <span className="flex-1 truncate text-xs text-[var(--color-text-dim)]">
                    {action.description}
                  </span>
                  <span className="text-xs capitalize text-[var(--color-text-dim)]">
                    {action.status}
                  </span>
                </div>
                {action.result && (
                  <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 font-mono text-xs text-[var(--color-green)]">
                    {action.result}
                  </pre>
                )}
                {action.error && (
                  <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 font-mono text-xs text-[var(--color-red)]">
                    {action.error}
                  </pre>
                )}
              </div>
            );
          })}
          {(!allActions || allActions.length === 0) && (
            <p className="py-8 text-center text-sm text-[var(--color-text-dim)]">
              No actions yet. Chat with FutureBuddy and it will suggest
              system commands when needed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
