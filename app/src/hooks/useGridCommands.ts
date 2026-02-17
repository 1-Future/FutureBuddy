import { useCallback } from 'react';
import { useGridStore } from '../stores/grid.store';

/**
 * Handles grid-related text commands from chat.
 * The grid + voice recognition runs natively, but users can also
 * type commands in chat as a fallback.
 */
export function useGridCommands() {
  const showGrid = useGridStore((s) => s.showGrid);
  const hideGrid = useGridStore((s) => s.hideGrid);

  const handleVoiceText = useCallback(
    async (text: string): Promise<boolean> => {
      const lower = text.toLowerCase().trim();

      if (/^(?:grid on|show grid|grid show|enable grid|grid)$/.test(lower)) {
        showGrid();
        return true;
      }

      if (/^(?:grid off|hide grid|grid hide|disable grid|stop grid)$/.test(lower)) {
        hideGrid();
        return true;
      }

      return false;
    },
    [showGrid, hideGrid],
  );

  return { handleVoiceText };
}
