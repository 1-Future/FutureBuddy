import { useState, useCallback } from 'react';
import * as api from '../services/api';
import type { ToolInfo, ToolOperationInfo } from '../types/models';

export function useTools() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [operations, setOperations] = useState<ToolOperationInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsRes, opsRes] = await Promise.all([
        api.getTools(),
        api.getToolOperations(),
      ]);
      setTools(toolsRes.tools ?? []);
      setOperations(opsRes.operations ?? []);
    } catch (err) {
      console.error('Failed to fetch tools:', err);
    }
    setLoading(false);
  }, []);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.scanTools();
      setTools(res.tools ?? []);
    } catch (err) {
      console.error('Failed to scan tools:', err);
    }
    setLoading(false);
  }, []);

  const installed = tools.filter((t) => t.installed);

  // Group by domain
  const byDomain = tools.reduce<Record<string, ToolInfo[]>>((acc, t) => {
    (acc[t.domain] ??= []).push(t);
    return acc;
  }, {});

  return { tools, installed, byDomain, operations, loading, fetchTools, scan };
}
