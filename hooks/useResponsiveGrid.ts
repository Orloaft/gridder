import { useState, useEffect } from 'react';

export interface ResponsiveGridDimensions {
  mainGridCellSize: number;
  inventoryGridCellSize: number;
  unitInfoPanelWidth: number;
  totalWidth: number;
  totalHeight: number;
}

/**
 * Custom hook to calculate responsive grid dimensions based on viewport size
 * Maintains the 8x8 main grid, 3x12 inventory grid, and left panel
 * Ensures everything fits without scrolling while maintaining aspect ratios
 */
export function useResponsiveGrid(): ResponsiveGridDimensions {
  const [dimensions, setDimensions] = useState<ResponsiveGridDimensions>({
    mainGridCellSize: 100,
    inventoryGridCellSize: 80,
    unitInfoPanelWidth: 280,
    totalWidth: 1600,
    totalHeight: 800,
  });

  useEffect(() => {
    const calculateDimensions = () => {
      // Get viewport dimensions with some padding
      const viewportWidth = window.innerWidth - 64; // 32px padding on each side
      // Account for DoomsdayTracker at top (approx 40px when minimized) and reduce bottom padding
      const viewportHeight = window.innerHeight - 80; // 40px top (tracker) + 40px padding

      // Main grid is 8x8
      const mainGridRows = 8;
      const mainGridCols = 8;

      // Inventory grid is 3x12
      const inventoryCols = 3;
      const inventoryRows = 12;

      // Calculate based on height constraint (main grid is tallest at 8 rows)
      const maxMainCellSizeByHeight = Math.floor(viewportHeight / mainGridRows);

      // Calculate based on width constraint
      // Layout: [UnitInfoPanel] [MainGrid] [InventoryGrid] with gaps
      const gapWidth = 32; // 32px gap between panels

      // Start with reasonable panel sizes
      let unitInfoPanelWidth = 280;

      // Calculate available width for grids after panels and gaps
      const availableWidthForGrids = viewportWidth - unitInfoPanelWidth - (gapWidth * 2);

      // Main grid needs 8 cells, inventory needs 3 cells
      // Calculate cell size that fits both grids
      const mainGridWidthRatio = mainGridCols / (mainGridCols + inventoryCols);
      const inventoryGridWidthRatio = inventoryCols / (mainGridCols + inventoryCols);

      const maxMainCellSizeByWidth = Math.floor(
        (availableWidthForGrids * mainGridWidthRatio) / mainGridCols
      );

      // Use the smaller of the two constraints
      const mainGridCellSize = Math.min(
        maxMainCellSizeByHeight,
        maxMainCellSizeByWidth,
        100 // Max size cap for large screens
      );

      // Inventory grid maintains aspect ratio with main grid
      // Inventory is 12 rows tall, main grid is 8 rows
      // So inventory cell should be: (mainCellSize * 8) / 12 to match height
      const inventoryGridCellSize = Math.floor((mainGridCellSize * mainGridRows) / inventoryRows);

      // Scale unit info panel proportionally, but keep a minimum width
      const scaledUnitInfoPanelWidth = Math.max(
        200, // Minimum width
        Math.min(280, Math.floor(unitInfoPanelWidth * (mainGridCellSize / 100)))
      );

      // Calculate total dimensions
      const mainGridWidth = mainGridCellSize * mainGridCols;
      const inventoryGridWidth = inventoryGridCellSize * inventoryCols;
      const totalWidth = scaledUnitInfoPanelWidth + mainGridWidth + inventoryGridWidth + (gapWidth * 2);
      const totalHeight = mainGridCellSize * mainGridRows;

      setDimensions({
        mainGridCellSize,
        inventoryGridCellSize,
        unitInfoPanelWidth: scaledUnitInfoPanelWidth,
        totalWidth,
        totalHeight,
      });
    };

    // Calculate on mount
    calculateDimensions();

    // Recalculate on window resize
    window.addEventListener('resize', calculateDimensions);

    return () => {
      window.removeEventListener('resize', calculateDimensions);
    };
  }, []);

  return dimensions;
}
