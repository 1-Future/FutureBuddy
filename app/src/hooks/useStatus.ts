import { useState, useEffect, useCallback, useRef } from 'react';
import { getSystemStatus } from '../services/api';
import type { SystemStatus } from '../types/models';

export function useStatus(pollIntervalMs = 10_000) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getSystemStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, pollIntervalMs);
    return () => clearInterval(intervalRef.current);
  }, [fetchStatus, pollIntervalMs]);

  return { status, error, refresh: fetchStatus };
}
