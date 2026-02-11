import { AnyGridOccupant } from '@/types/grid.types';
import type { StoreSet, StoreGet } from '../storeTypes';

export const gridInitialState = {
  gridOccupants: [] as AnyGridOccupant[],
  gridSize: { rows: 8, cols: 8 },
  zoomLevel: 1.0,
};

export function createGridSlice(set: StoreSet, get: StoreGet) {
  return {
    ...gridInitialState,

    updateGridOccupants: (occupants: AnyGridOccupant[]) =>
      set({ gridOccupants: occupants }),

    setGridSize: (rows: number, cols: number) => {
      set({ gridSize: { rows, cols } });
    },

    setZoomLevel: (zoom: number) => {
      const clampedZoom = Math.max(0.5, Math.min(1.5, zoom));
      set({ zoomLevel: clampedZoom });
    },

    zoomIn: () => {
      const state = get();
      const newZoom = Math.min(1.5, state.zoomLevel + 0.25);
      set({ zoomLevel: newZoom });
    },

    zoomOut: () => {
      const state = get();
      const newZoom = Math.max(0.5, state.zoomLevel - 0.25);
      set({ zoomLevel: newZoom });
    },

    resetZoom: () => {
      set({ zoomLevel: 1.0 });
    },
  };
}
