import { GridPosition } from '@/types/grid.types';

/**
 * GridManager: Single source of truth for grid tile occupancy
 *
 * Provides O(1) collision detection and atomic move operations
 * to prevent unit stacking and race conditions.
 *
 * Key Principles:
 * - Grid positions are exclusive resources (only one unit per tile)
 * - All position changes must go through atomic move() operations
 * - Occupancy map is the single source of truth
 */
export class GridManager {
  private width: number;
  private height: number;
  private occupancy: Map<string, string>; // "row,col" -> unitId

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.occupancy = new Map();
  }

  // ========================================
  // Core Occupancy Methods
  // ========================================

  /**
   * Check if a position is occupied by any unit
   */
  public isOccupied(position: GridPosition): boolean {
    return this.occupancy.has(this.key(position));
  }

  /**
   * Get the ID of the unit occupying a position
   * Returns null if position is empty
   */
  public getOccupant(position: GridPosition): string | null {
    return this.occupancy.get(this.key(position)) || null;
  }

  /**
   * Occupy a tile with a unit (for spawning)
   * Returns true if successful, false if tile already occupied or out of bounds
   */
  public occupy(position: GridPosition, unitId: string): boolean {
    // Validate position structure
    if (!position || typeof position.row !== 'number' || typeof position.col !== 'number') {
      console.error(`[GridManager] Invalid position structure:`, position);
      return false;
    }

    if (!this.isInBounds(position)) {
      console.warn(`[GridManager] Cannot occupy out of bounds position (${position.row},${position.col})`);
      return false;
    }

    const currentOccupant = this.getOccupant(position);
    if (currentOccupant) {
      console.warn(`[GridManager] Cannot occupy (${position.row},${position.col}) - already occupied by ${currentOccupant}`);
      return false;
    }

    this.occupancy.set(this.key(position), unitId);
    // Debug: console.log(`[GridManager] Unit ${unitId} occupied (${position.row},${position.col})`);
    return true;
  }

  /**
   * Vacate a tile (for unit death/despawn)
   */
  public vacate(position: GridPosition): void {
    const key = this.key(position);
    const occupant = this.occupancy.get(key);
    if (occupant) {
      this.occupancy.delete(key);
      // Debug: console.log(`[GridManager] Unit ${occupant} vacated (${position.row},${position.col})`);
    }
  }

  /**
   * Atomic move operation: move unit from one tile to another
   *
   * This is THE core method that prevents stacking:
   * - Validates destination is in bounds
   * - Validates destination is not occupied
   * - Validates unit actually occupies the source position
   * - Performs atomic vacate + occupy
   *
   * Returns true if successful, false if move was blocked
   */
  public move(unitId: string, from: GridPosition, to: GridPosition): boolean {
    // Validate positions
    if (!from || !to) {
      console.error(`[GridManager] Invalid positions for move:`, { from, to });
      return false;
    }

    // Validate destination
    if (!this.isInBounds(to)) {
      console.warn(`[GridManager] Unit ${unitId} cannot move to out of bounds (${to.row},${to.col})`);
      return false;
    }

    const destOccupant = this.getOccupant(to);
    if (destOccupant) {
      // Debug: console.log(`[GridManager] Unit ${unitId} cannot move to (${to.row},${to.col}) - occupied by ${destOccupant}`);
      return false;
    }

    // Validate unit actually occupies source position
    const currentOccupant = this.getOccupant(from);
    if (currentOccupant !== unitId) {
      console.error(`[GridManager] Unit ${unitId} tried to move from (${from.row},${from.col}) but doesn't occupy it (occupied by: ${currentOccupant || 'nobody'})`);
      return false;
    }

    // Atomic move: vacate source, occupy destination
    this.vacate(from);
    this.occupancy.set(this.key(to), unitId); // Direct set since we already validated
    // Debug: console.log(`[GridManager] Unit ${unitId} moved from (${from.row},${from.col}) to (${to.row},${to.col})`);
    return true;
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Check if position is within grid bounds
   */
  public isInBounds(position: GridPosition): boolean {
    return position.row >= 0 && position.row < this.height &&
           position.col >= 0 && position.col < this.width;
  }

  /**
   * Check if position is walkable (in bounds and not occupied)
   */
  public isWalkable(position: GridPosition, excludeUnit?: string): boolean {
    if (!this.isInBounds(position)) {
      return false;
    }

    const occupant = this.getOccupant(position);

    // Empty tile is walkable
    if (!occupant) {
      return true;
    }

    // If excluding a unit, treat that unit's tile as walkable
    if (excludeUnit && occupant === excludeUnit) {
      return true;
    }

    return false;
  }

  /**
   * Find nearest empty tile to a given position (spiral search)
   * Useful for spawn fallback when requested position is occupied
   */
  public findNearestEmptyTile(position: GridPosition, maxRadius: number = 5): GridPosition | null {
    // Check center first
    if (this.isWalkable(position)) {
      return position;
    }

    // Spiral search outward
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dRow = -radius; dRow <= radius; dRow++) {
        for (let dCol = -radius; dCol <= radius; dCol++) {
          // Only check perimeter of current radius (optimization)
          if (Math.abs(dRow) !== radius && Math.abs(dCol) !== radius) {
            continue;
          }

          const checkPos: GridPosition = {
            row: position.row + dRow,
            col: position.col + dCol,
          };

          if (this.isWalkable(checkPos)) {
            return checkPos;
          }
        }
      }
    }

    return null; // No empty tiles found within radius
  }

  /**
   * Get all adjacent positions (4-directional)
   */
  public getAdjacentPositions(position: GridPosition): GridPosition[] {
    return [
      { row: position.row, col: position.col + 1 }, // Right
      { row: position.row, col: position.col - 1 }, // Left
      { row: position.row + 1, col: position.col }, // Down
      { row: position.row - 1, col: position.col }, // Up
    ].filter(pos => this.isInBounds(pos));
  }

  /**
   * Get all adjacent positions including diagonals (8-directional)
   */
  public getAdjacentPositionsWithDiagonals(position: GridPosition): GridPosition[] {
    return [
      // Cardinal directions
      { row: position.row, col: position.col + 1 }, // Right
      { row: position.row, col: position.col - 1 }, // Left
      { row: position.row + 1, col: position.col }, // Down
      { row: position.row - 1, col: position.col }, // Up
      // Diagonals
      { row: position.row + 1, col: position.col + 1 }, // Down-Right
      { row: position.row + 1, col: position.col - 1 }, // Down-Left
      { row: position.row - 1, col: position.col + 1 }, // Up-Right
      { row: position.row - 1, col: position.col - 1 }, // Up-Left
    ].filter(pos => this.isInBounds(pos));
  }

  // ========================================
  // Private Helpers
  // ========================================

  /**
   * Convert position to map key
   */
  private key(position: GridPosition): string {
    return `${position.row},${position.col}`;
  }

  /**
   * Debug method to verify grid consistency
   * Returns array of issues found
   */
  public verifyConsistency(units: Array<{ id: string; position: GridPosition; isAlive: boolean }>): string[] {
    const issues: string[] = [];

    // Check that all alive units have their positions registered
    for (const unit of units) {
      if (!unit.isAlive) continue;

      const occupant = this.getOccupant(unit.position);
      if (occupant !== unit.id) {
        issues.push(`Unit ${unit.id} at (${unit.position.row},${unit.position.col}) but grid shows ${occupant || 'empty'}`);
      }
    }

    // Check that all occupied positions have corresponding alive units
    for (const [key, unitId] of this.occupancy.entries()) {
      const unit = units.find(u => u.id === unitId);
      if (!unit) {
        issues.push(`Grid has ${unitId} at ${key} but unit not found`);
      } else if (!unit.isAlive) {
        issues.push(`Grid has dead unit ${unitId} at ${key}`);
      } else {
        const expectedKey = this.key(unit.position);
        if (key !== expectedKey) {
          issues.push(`Grid has ${unitId} at ${key} but unit position is ${expectedKey}`);
        }
      }
    }

    return issues;
  }

  // ========================================
  // Debug Helpers
  // ========================================

  /**
   * Get visual occupancy map for debugging
   * Returns 2D array where '.' = empty, 'X' = occupied
   */
  public getOccupancyMap(): string[][] {
    const map: string[][] = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill('.'));

    this.occupancy.forEach((unitId, key) => {
      const [row, col] = key.split(',').map(Number);
      if (row >= 0 && row < this.height && col >= 0 && col < this.width) {
        map[row][col] = 'X';
      }
    });

    return map;
  }

  /**
   * Print occupancy map to console for debugging
   */
  public printOccupancy(): void {
    console.log('=== Grid Occupancy Map ===');
    this.getOccupancyMap().forEach((row, rowIndex) => {
      console.log(`Row ${rowIndex}: ${row.join(' ')}`);
    });
    console.log(`Total occupied tiles: ${this.occupancy.size}`);
  }

  /**
   * Verify no stacking has occurred (debug check)
   * Returns array of positions with multiple units (should always be empty)
   */
  public verifyNoStacking(): { position: string; units: string[] }[] {
    const violations: { position: string; units: string[] }[] = [];
    const positionCounts = new Map<string, string[]>();

    this.occupancy.forEach((unitId, key) => {
      if (!positionCounts.has(key)) {
        positionCounts.set(key, []);
      }
      positionCounts.get(key)!.push(unitId);
    });

    positionCounts.forEach((units, position) => {
      if (units.length > 1) {
        violations.push({ position, units });
      }
    });

    return violations;
  }

  /**
   * Clear all occupancy (for resetting battle state)
   */
  public clear(): void {
    this.occupancy.clear();
  }

  /**
   * Get grid dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Get total number of occupied tiles
   */
  public getOccupiedCount(): number {
    return this.occupancy.size;
  }
}
