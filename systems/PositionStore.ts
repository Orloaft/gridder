/**
 * PositionStore - Single source of truth for all unit positions
 *
 * This store maintains the authoritative position state for all units in the game.
 * All position queries and updates must go through this store to ensure consistency.
 */

export interface Position {
  row: number;
  col: number;
}

export interface PositionEvent {
  type: 'initialized' | 'move-started' | 'move-committed' | 'move-rolled-back' | 'removed' | 'batch-update';
  unitId?: string;
  from?: Position;
  to?: Position;
  positions: Map<string, Position>;
  timestamp: number;
}

interface MoveTransaction {
  id: string;
  unitId: string;
  from: Position;
  to: Position;
  startTime: number;
}

export class PositionStore {
  private positions: Map<string, Position> = new Map();
  private occupancy: Map<string, string> = new Map(); // "row,col" -> unitId
  private moveLocks: Set<string> = new Set(); // unitIds currently moving
  private transactions: Map<string, MoveTransaction> = new Map();
  private listeners: Set<(event: PositionEvent) => void> = new Set();

  private readonly gridWidth: number;
  private readonly gridHeight: number;

  constructor(width: number = 8, height: number = 8) {
    this.gridWidth = width;
    this.gridHeight = height;
  }

  // ========== Pure Query Functions ==========

  /**
   * Get the current position of a unit
   */
  getPosition(unitId: string): Position | null {
    const pos = this.positions.get(unitId);
    return pos ? { ...pos } : null; // Return copy to prevent external mutation
  }

  /**
   * Check if a position is occupied
   */
  isOccupied(position: Position): boolean {
    return this.occupancy.has(this.posKey(position));
  }

  /**
   * Get the unit occupying a position
   */
  getOccupant(position: Position): string | null {
    return this.occupancy.get(this.posKey(position)) || null;
  }

  /**
   * Check if a unit can move to a position
   */
  canMoveTo(unitId: string, position: Position): boolean {
    // Unit must exist
    if (!this.positions.has(unitId)) {
      return false;
    }

    // Unit must not be locked (currently moving)
    if (this.moveLocks.has(unitId)) {
      return false;
    }

    // Position must be valid
    if (!this.isValidPosition(position)) {
      return false;
    }

    // Position must be unoccupied or occupied by the same unit
    const occupant = this.getOccupant(position);
    return !occupant || occupant === unitId;
  }

  /**
   * Get all unit positions
   */
  getAllPositions(): Map<string, Position> {
    // Return a copy to prevent external mutation
    return new Map(Array.from(this.positions.entries()).map(([id, pos]) => [id, { ...pos }]));
  }

  /**
   * Check if a unit is currently moving
   */
  isMoving(unitId: string): boolean {
    return this.moveLocks.has(unitId);
  }

  // ========== State Mutation Functions ==========

  /**
   * Initialize a unit at a position
   */
  initializeUnit(unitId: string, position: Position): boolean {
    // Check if unit already exists
    if (this.positions.has(unitId)) {
      console.warn(`[PositionStore] Unit ${unitId} already initialized`);
      return false;
    }

    // Check if position is valid
    if (!this.isValidPosition(position)) {
      console.error(`[PositionStore] Invalid position for ${unitId}: (${position.row},${position.col})`);
      return false;
    }

    // Check if position is occupied
    if (this.isOccupied(position)) {
      console.error(`[PositionStore] Position (${position.row},${position.col}) already occupied`);
      return false;
    }

    // Add unit
    this.positions.set(unitId, { ...position });
    this.occupancy.set(this.posKey(position), unitId);

    // Emit event
    this.emit({
      type: 'initialized',
      unitId,
      to: position,
      positions: this.getAllPositions(),
      timestamp: Date.now()
    });

    console.log(`[PositionStore] Initialized ${unitId} at (${position.row},${position.col})`);
    return true;
  }

  /**
   * Begin a move transaction
   * Returns a moveId if successful, null if move cannot be started
   */
  beginMove(unitId: string, to: Position): string | null {
    // Validate move
    if (!this.canMoveTo(unitId, to)) {
      console.log(`[PositionStore] Cannot move ${unitId} to (${to.row},${to.col})`);
      return null;
    }

    const from = this.positions.get(unitId)!;

    // Check if trying to move to same position
    if (from.row === to.row && from.col === to.col) {
      console.log(`[PositionStore] Unit ${unitId} already at (${to.row},${to.col})`);
      return null;
    }

    // Create transaction
    const moveId = `move_${unitId}_${Date.now()}`;
    const transaction: MoveTransaction = {
      id: moveId,
      unitId,
      from: { ...from },
      to: { ...to },
      startTime: Date.now()
    };

    // Lock the unit
    this.moveLocks.add(unitId);
    this.transactions.set(moveId, transaction);

    // Reserve the destination
    this.occupancy.set(this.posKey(to), unitId);

    // Emit event
    this.emit({
      type: 'move-started',
      unitId,
      from,
      to,
      positions: this.getAllPositions(),
      timestamp: Date.now()
    });

    console.log(`[PositionStore] Started move ${moveId}: ${unitId} from (${from.row},${from.col}) to (${to.row},${to.col})`);
    return moveId;
  }

  /**
   * Commit a move transaction
   */
  commitMove(moveId: string): boolean {
    const transaction = this.transactions.get(moveId);
    if (!transaction) {
      console.error(`[PositionStore] Transaction ${moveId} not found`);
      return false;
    }

    // Clear old position
    this.occupancy.delete(this.posKey(transaction.from));

    // Update position
    this.positions.set(transaction.unitId, { ...transaction.to });

    // Clear lock
    this.moveLocks.delete(transaction.unitId);
    this.transactions.delete(moveId);

    // Emit event
    this.emit({
      type: 'move-committed',
      unitId: transaction.unitId,
      from: transaction.from,
      to: transaction.to,
      positions: this.getAllPositions(),
      timestamp: Date.now()
    });

    console.log(`[PositionStore] Committed move ${moveId}`);
    return true;
  }

  /**
   * Rollback a move transaction
   */
  rollbackMove(moveId: string): boolean {
    const transaction = this.transactions.get(moveId);
    if (!transaction) {
      console.error(`[PositionStore] Transaction ${moveId} not found`);
      return false;
    }

    // Clear reservation
    const destOccupant = this.occupancy.get(this.posKey(transaction.to));
    if (destOccupant === transaction.unitId) {
      this.occupancy.delete(this.posKey(transaction.to));
    }

    // Clear lock
    this.moveLocks.delete(transaction.unitId);
    this.transactions.delete(moveId);

    // Emit event
    this.emit({
      type: 'move-rolled-back',
      unitId: transaction.unitId,
      from: transaction.from,
      to: transaction.to,
      positions: this.getAllPositions(),
      timestamp: Date.now()
    });

    console.log(`[PositionStore] Rolled back move ${moveId}`);
    return true;
  }

  /**
   * Remove a unit from the store
   */
  removeUnit(unitId: string): boolean {
    const position = this.positions.get(unitId);
    if (!position) {
      return false;
    }

    // Clear any active transactions
    for (const [moveId, transaction] of this.transactions) {
      if (transaction.unitId === unitId) {
        this.rollbackMove(moveId);
      }
    }

    // Remove from maps
    this.positions.delete(unitId);
    this.occupancy.delete(this.posKey(position));
    this.moveLocks.delete(unitId);

    // Emit event
    this.emit({
      type: 'removed',
      unitId,
      from: position,
      positions: this.getAllPositions(),
      timestamp: Date.now()
    });

    console.log(`[PositionStore] Removed ${unitId} from (${position.row},${position.col})`);
    return true;
  }

  /**
   * Batch update positions (for wave transitions)
   * This is atomic - either all updates succeed or none do
   */
  batchUpdate(updates: Array<{ unitId: string; position: Position }>): boolean {
    // Validate all updates first
    const newOccupancy = new Map<string, string>();

    for (const update of updates) {
      // Check if unit exists
      if (!this.positions.has(update.unitId)) {
        console.error(`[PositionStore] Unit ${update.unitId} not found for batch update`);
        return false;
      }

      // Check if unit is locked
      if (this.moveLocks.has(update.unitId)) {
        console.error(`[PositionStore] Unit ${update.unitId} is locked for batch update`);
        return false;
      }

      // Check if position is valid
      if (!this.isValidPosition(update.position)) {
        console.error(`[PositionStore] Invalid position for ${update.unitId}: (${update.position.row},${update.position.col})`);
        return false;
      }

      // Check for conflicts in the new occupancy map
      const key = this.posKey(update.position);
      if (newOccupancy.has(key)) {
        console.error(`[PositionStore] Conflict: Multiple units trying to occupy (${update.position.row},${update.position.col})`);
        return false;
      }

      newOccupancy.set(key, update.unitId);
    }

    // Apply all updates
    this.occupancy.clear();
    for (const update of updates) {
      this.positions.set(update.unitId, { ...update.position });
      this.occupancy.set(this.posKey(update.position), update.unitId);
    }

    // Emit event
    this.emit({
      type: 'batch-update',
      positions: this.getAllPositions(),
      timestamp: Date.now()
    });

    console.log(`[PositionStore] Batch updated ${updates.length} positions`);
    return true;
  }

  // ========== Event System ==========

  /**
   * Subscribe to position events
   */
  subscribe(listener: (event: PositionEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Unsubscribe from position events
   */
  unsubscribe(listener: (event: PositionEvent) => void): void {
    this.listeners.delete(listener);
  }

  private emit(event: PositionEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // ========== Helper Functions ==========

  private posKey(position: Position): string {
    return `${position.row},${position.col}`;
  }

  private isValidPosition(position: Position): boolean {
    return position.row >= 0 && position.row < this.gridHeight &&
           position.col >= 0 && position.col < this.gridWidth;
  }

  /**
   * Debug function to check consistency
   */
  validateConsistency(): string[] {
    const issues: string[] = [];

    // Check that all positions have occupancy entries
    for (const [unitId, position] of this.positions) {
      const key = this.posKey(position);
      const occupant = this.occupancy.get(key);
      if (occupant !== unitId) {
        issues.push(`Unit ${unitId} at (${position.row},${position.col}) but occupancy shows ${occupant}`);
      }
    }

    // Check that all occupancy entries have positions
    for (const [key, unitId] of this.occupancy) {
      if (!this.positions.has(unitId)) {
        issues.push(`Occupancy ${key} -> ${unitId} but unit not in positions`);
      }
    }

    // Check active transactions
    for (const [moveId, transaction] of this.transactions) {
      if (!this.moveLocks.has(transaction.unitId)) {
        issues.push(`Transaction ${moveId} exists but unit ${transaction.unitId} not locked`);
      }
    }

    return issues;
  }
}