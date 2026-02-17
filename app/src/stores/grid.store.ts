import { create } from 'zustand';
import TapService from '../native/TapService';

interface GridState {
  gridActive: boolean;
  gridRows: number;
  gridCols: number;

  showGrid: () => void;
  hideGrid: () => void;
  setGridSize: (rows: number, cols: number) => void;
}

export const useGridStore = create<GridState>((set, get) => ({
  gridActive: false,
  gridRows: 3,
  gridCols: 3,

  showGrid: () => {
    const { gridRows, gridCols } = get();
    TapService.setGridConfig(gridRows, gridCols);
    TapService.showGrid();
    set({ gridActive: true });
  },

  hideGrid: () => {
    TapService.hideGrid();
    set({ gridActive: false });
  },

  setGridSize: (rows, cols) => {
    const r = Math.max(1, Math.min(10, rows));
    const c = Math.max(1, Math.min(10, cols));
    set({ gridRows: r, gridCols: c });
    const { gridActive } = get();
    if (gridActive) {
      TapService.setGridConfig(r, c);
      TapService.showGrid();
    }
  },
}));
