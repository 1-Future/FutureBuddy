import { useCallback } from 'react';
import { useActionsStore } from '../stores/actions.store';
import { useConnectionStore } from '../stores/connection.store';
import * as api from '../services/api';

export function useActions() {
  const { actions, setActions, removeAction } = useActionsStore();
  const setPendingBadgeCount = useConnectionStore((s) => s.setPendingBadgeCount);

  const fetchPending = useCallback(async () => {
    try {
      const res = await api.getPendingActions();
      setActions(res.actions);
      setPendingBadgeCount(res.actions.length);
    } catch (err) {
      console.error('Failed to fetch pending actions:', err);
    }
  }, [setActions, setPendingBadgeCount]);

  const approve = useCallback(
    async (id: string) => {
      try {
        await api.resolveAction(id, true);
        removeAction(id);
        useConnectionStore.getState().decrementBadge();
      } catch (err) {
        console.error('Failed to approve action:', err);
      }
    },
    [removeAction],
  );

  const deny = useCallback(
    async (id: string) => {
      try {
        await api.resolveAction(id, false);
        removeAction(id);
        useConnectionStore.getState().decrementBadge();
      } catch (err) {
        console.error('Failed to deny action:', err);
      }
    },
    [removeAction],
  );

  return { actions, fetchPending, approve, deny };
}
