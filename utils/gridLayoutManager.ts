import { AnyGridOccupant, GridPosition } from '@/types/grid.types';

// Helper to check if a position is within grid bounds
export function isValidPosition(position: GridPosition, rows: number, cols: number): boolean {
  return (
    position.row >= 0 &&
    position.row < rows &&
    position.col >= 0 &&
    position.col < cols
  );
}

// Helper to check if a cell is occupied
export function isCellOccupied(
  position: GridPosition,
  occupants: AnyGridOccupant[]
): boolean {
  return occupants.some(
    (occ) =>
      occ.position.row === position.row &&
      occ.position.col === position.col
  );
}

// Find all empty cells in the grid
export function findEmptyCells(
  rows: number,
  cols: number,
  occupants: AnyGridOccupant[]
): GridPosition[] {
  const emptyCells: GridPosition[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const position = { row, col };
      if (!isCellOccupied(position, occupants)) {
        emptyCells.push(position);
      }
    }
  }

  return emptyCells;
}

// Get adjacent cells (4-directional)
export function getAdjacentCells(position: GridPosition, rows: number, cols: number): GridPosition[] {
  const adjacent: GridPosition[] = [];
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 },  // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 },  // right
  ];

  for (const dir of directions) {
    const newPos = {
      row: position.row + dir.row,
      col: position.col + dir.col,
    };
    if (isValidPosition(newPos, rows, cols)) {
      adjacent.push(newPos);
    }
  }

  return adjacent;
}

// Calculate distance between two positions (Manhattan distance)
export function calculateDistance(pos1: GridPosition, pos2: GridPosition): number {
  return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
}

// Get all positions in a rectangular area
export function getAreaPositions(
  topLeft: GridPosition,
  width: number,
  height: number,
  rows: number,
  cols: number
): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const position = {
        row: topLeft.row + r,
        col: topLeft.col + c,
      };
      if (isValidPosition(position, rows, cols)) {
        positions.push(position);
      }
    }
  }

  return positions;
}
