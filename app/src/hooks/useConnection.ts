import { useEffect } from 'react';
import { useConnectionStore } from '../stores/connection.store';
import { wsManager } from '../services/ws';

export function useConnection() {
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const wsState = useConnectionStore((s) => s.wsState);

  useEffect(() => {
    wsManager.connect();
    return () => {
      wsManager.disconnect();
    };
  }, [serverUrl]);

  return { wsState, isConnected: wsState === 'connected' };
}
