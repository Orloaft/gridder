import { GridPosition } from '@/types/grid.types';

/**
 * Represents the complete position state of a unit
 */
export interface UnitPositionState {
  unitId: string;
  logicalPosition: GridPosition;  // Where the game logic thinks the unit is
  visualPosition: GridPosition;   // Where the unit appears on screen
  targetPosition: GridPosition | null;  // Where the unit is moving to (if animating)
  isAnimating: boolean;
  transactionId: string | null;   // Current movement transaction
}

/**
 * A movement transaction that ensures atomic position updates
 */
export interface MoveTransaction {
  id: string;
  unitId: string;
  from: GridPosition;
  to: GridPosition;
  state: 'pending' | 'reserved' | 'animating' | 'committing' | 'complete' | 'failed';
  startTime: number;
  animation?: any;  // GSAP animation reference
  error?: string;
}

/**
 * PositionManager: Single source of truth for all unit positions
 *
 * This class manages the complex relationship between logical game positions
 * and visual display positions, ensuring they stay synchronized while allowing
 * for smooth animations.
 */
export class PositionManager {
  private unitStates: Map<string, UnitPositionState> = new Map();
  private transactions: Map<string, MoveTransaction> = new Map();
  private occupancyGrid: Map<string, string> = new Map(); // "row,col" -> unitId
  private gridWidth: number;
  private gridHeight: number;
  private movementLocked: boolean = false;

  constructor(width: number = 8, height: number = 8) {
    this.gridWidth = width;
    this.gridHeight = height;
  }

  /**
   * Initialize a unit's position (used when spawning)
   */
  public initializeUnit(unitId: string, position: GridPosition): boolean {
    if (this.unitStates.has(unitId)) {
      console.warn(`[PositionManager] Unit ${unitId} already initialized`);
      return false;
    }

    // Allow col 8 for off-screen enemies, but not col 9+
    if (position.col > 8 || position.row >= this.gridHeight || position.col < 0 || position.row < 0) {
      console.error(`[PositionManager] Cannot initialize ${unitId} at invalid position (${position.row},${position.col}). Grid is ${this.gridHeight}x${this.gridWidth}, col 8 is allowed for off-screen`);
      return false;
    }

    const key = this.positionKey(position);
    if (this.occupancyGrid.has(key)) {
      const occupant = this.occupancyGrid.get(key);
      console.error(`[PositionManager] Cannot initialize ${unitId} at occupied position ${key} - already occupied by ${occupant}`);
      return false;
    }

    // Create initial state with synced positions
    const state: UnitPositionState = {
      unitId,
      logicalPosition: { ...position },
      visualPosition: { ...position },
      targetPosition: null,
      isAnimating: false,
      transactionId: null
    };

    this.unitStates.set(unitId, state);
    // Only track occupancy for on-grid positions (col < 8)
    // Off-screen positions (col 8) don't need occupancy tracking
    if (position.col < 8) {
      this.occupancyGrid.set(key, unitId);
    }

    console.log(`[PositionManager] Initialized ${unitId} at (${position.row},${position.col})${position.col === 8 ? ' (off-screen)' : ''}`);
    return true;
  }

  /**
   * Synchronously move a unit to a new position
   * Used during battle ticks when we need immediate position updates
   */
  public moveUnit(unitId: string, to: GridPosition): boolean {
    const state = this.unitStates.get(unitId);
    if (!state) {
      console.error(`[PositionManager] Cannot move unknown unit ${unitId}`);
      return false;
    }

    // Check if destination is valid
    if (!this.isValidPosition(to)) {
      return false;
    }

    // Check if destination is occupied by another unit (only for on-grid positions)
    const destKey = this.positionKey(to);
    if (to.col < 8) {  // Only check occupancy for on-grid positions
      const occupant = this.occupancyGrid.get(destKey);
      if (occupant && occupant !== unitId) {
        return false;
      }
    }

    // Clear old position (only if it was on-grid)
    const oldKey = this.positionKey(state.logicalPosition);
    if (state.logicalPosition.col < 8 && this.occupancyGrid.get(oldKey) === unitId) {
      this.occupancyGrid.delete(oldKey);
    }

    // Update to new position
    state.logicalPosition = { ...to };
    state.visualPosition = { ...to };
    state.targetPosition = null;
    state.isAnimating = false;
    state.transactionId = null;

    // Occupy new position (only if on-grid)
    if (to.col < 8) {
      this.occupancyGrid.set(destKey, unitId);
    }

    return true;
  }

  /**
   * Remove a unit from position tracking (death/despawn)
   */
  public removeUnit(unitId: string): void {
    const state = this.unitStates.get(unitId);
    if (!state) return;

    // Clear occupancy
    const key = this.positionKey(state.logicalPosition);
    if (this.occupancyGrid.get(key) === unitId) {
      this.occupancyGrid.delete(key);
    }

    // Cancel any pending transactions
    if (state.transactionId) {
      this.rollbackTransaction(state.transactionId);
    }

    this.unitStates.delete(unitId);
    console.log(`[PositionManager] Removed ${unitId}`);
  }

  /**
   * Request a unit movement (returns transaction ID if successful)
   */
  public async requestMove(unitId: string, to: GridPosition): Promise<string | null> {
    // Check if movement is allowed
    if (this.movementLocked) {
      console.log(`[PositionManager] Movement locked, rejecting move for ${unitId}`);
      return null;
    }

    const state = this.unitStates.get(unitId);
    if (!state) {
      console.error(`[PositionManager] Unknown unit ${unitId}`);
      return null;
    }

    if (state.isAnimating) {
      console.log(`[PositionManager] Unit ${unitId} is already animating`);
      return null;
    }

    // Validate destination
    if (!this.isValidPosition(to)) {
      console.log(`[PositionManager] Invalid destination (${to.row},${to.col}) for ${unitId}`);
      return null;
    }

    // Only check occupancy for on-grid destinations
    if (to.col < 8) {
      const destKey = this.positionKey(to);
      if (this.occupancyGrid.has(destKey)) {
        console.log(`[PositionManager] Destination (${to.row},${to.col}) occupied for ${unitId}`);
        return null;
      }
    }

    // Create transaction
    const transaction: MoveTransaction = {
      id: `move_${unitId}_${Date.now()}`,
      unitId,
      from: { ...state.logicalPosition },
      to: { ...to },
      state: 'pending',
      startTime: Date.now()
    };

    this.transactions.set(transaction.id, transaction);
    state.transactionId = transaction.id;

    // Reserve the destination
    if (!this.reservePosition(transaction)) {
      this.transactions.delete(transaction.id);
      state.transactionId = null;
      return null;
    }

    console.log(`[PositionManager] Created transaction ${transaction.id} for ${unitId} to (${to.row},${to.col})`);
    return transaction.id;
  }

  /**
   * Reserve a position for a transaction
   */
  private reservePosition(transaction: MoveTransaction): boolean {
    // Only reserve on-grid positions
    if (transaction.to.col < 8) {
      const destKey = this.positionKey(transaction.to);

      // Double-check destination is still free
      if (this.occupancyGrid.has(destKey)) {
        transaction.state = 'failed';
        transaction.error = 'Destination became occupied';
        return false;
      }

      // Reserve the destination
      this.occupancyGrid.set(destKey, transaction.unitId);
    }
    transaction.state = 'reserved';

    return true;
  }

  /**
   * Start animating a movement transaction
   */
  public startAnimation(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.state !== 'reserved') {
      console.error(`[PositionManager] Cannot animate transaction ${transactionId}`);
      return false;
    }

    const state = this.unitStates.get(transaction.unitId);
    if (!state) return false;

    // Update state for animation
    transaction.state = 'animating';
    state.isAnimating = true;
    state.targetPosition = transaction.to;

    console.log(`[PositionManager] Started animation for transaction ${transactionId}`);
    return true;
  }

  /**
   * Complete a movement transaction (called when animation finishes)
   */
  public completeTransaction(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.state !== 'animating') {
      console.error(`[PositionManager] Cannot complete transaction ${transactionId}`);
      return false;
    }

    const state = this.unitStates.get(transaction.unitId);
    if (!state) return false;

    transaction.state = 'committing';

    // Clear old position (only if it was on-grid)
    if (transaction.from.col < 8) {
      const oldKey = this.positionKey(transaction.from);
      if (this.occupancyGrid.get(oldKey) === transaction.unitId) {
        this.occupancyGrid.delete(oldKey);
      }
    }

    // Update positions
    state.logicalPosition = { ...transaction.to };
    state.visualPosition = { ...transaction.to };
    state.targetPosition = null;
    state.isAnimating = false;
    state.transactionId = null;

    // Mark transaction complete
    transaction.state = 'complete';

    console.log(`[PositionManager] Completed transaction ${transactionId}: ${transaction.unitId} now at (${transaction.to.row},${transaction.to.col})`);

    // Clean up completed transaction after a delay
    setTimeout(() => {
      this.transactions.delete(transactionId);
    }, 1000);

    return true;
  }

  /**
   * Rollback a failed transaction
   */
  private rollbackTransaction(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    const state = this.unitStates.get(transaction.unitId);

    // Remove reservation if any
    if (transaction.state === 'reserved' || transaction.state === 'animating') {
      const destKey = this.positionKey(transaction.to);
      if (this.occupancyGrid.get(destKey) === transaction.unitId) {
        this.occupancyGrid.delete(destKey);
      }
    }

    // Reset unit state
    if (state) {
      state.isAnimating = false;
      state.targetPosition = null;
      state.transactionId = null;
    }

    transaction.state = 'failed';
    console.log(`[PositionManager] Rolled back transaction ${transactionId}`);

    // Clean up after delay
    setTimeout(() => {
      this.transactions.delete(transactionId);
    }, 1000);
  }

  /**
   * Force sync visual position to logical position (for error recovery)
   */
  public forceSyncVisualToLogical(unitId: string): void {
    const state = this.unitStates.get(unitId);
    if (!state) return;

    state.visualPosition = { ...state.logicalPosition };
    state.isAnimating = false;
    state.targetPosition = null;

    if (state.transactionId) {
      this.rollbackTransaction(state.transactionId);
    }

    console.log(`[PositionManager] Force synced ${unitId} visual to logical position`);
  }

  /**
   * Get unit's logical position (for game logic)
   */
  public getLogicalPosition(unitId: string): GridPosition | null {
    const state = this.unitStates.get(unitId);
    return state ? { ...state.logicalPosition } : null;
  }

  /**
   * Get unit's visual position (for rendering)
   */
  public getVisualPosition(unitId: string): GridPosition | null {
    const state = this.unitStates.get(unitId);
    return state ? { ...state.visualPosition } : null;
  }

  /**
   * Get unit's target position (where it's moving to)
   */
  public getTargetPosition(unitId: string): GridPosition | null {
    const state = this.unitStates.get(unitId);
    return state ? state.targetPosition : null;
  }

  /**
   * Check if a position is occupied (by logical position)
   */
  public isOccupied(position: GridPosition): boolean {
    return this.occupancyGrid.has(this.positionKey(position));
  }

  /**
   * Get the unit occupying a position
   */
  public getOccupant(position: GridPosition): string | null {
    return this.occupancyGrid.get(this.positionKey(position)) || null;
  }

  /**
   * Check if unit is currently animating
   */
  public isAnimating(unitId: string): boolean {
    const state = this.unitStates.get(unitId);
    return state ? state.isAnimating : false;
  }

  /**
   * Lock all movement (for wave transitions)
   */
  public lockMovement(): void {
    this.movementLocked = true;
    console.log('[PositionManager] Movement locked');
  }

  /**
   * Unlock movement
   */
  public unlockMovement(): void {
    this.movementLocked = false;
    console.log('[PositionManager] Movement unlocked');
  }

  /**
   * Execute a wave scroll transition
   * @param scrollDistance Base scroll distance in grid cells
   * @param heroIds Set of unit IDs that are heroes (they get an extra shift)
   */
  public async executeWaveScroll(scrollDistance: number, heroIds?: Set<string>): Promise<void> {
    this.lockMovement();

    // Calculate new positions for all units
    const updates: Array<{unitId: string, newPos: GridPosition}> = [];

    for (const [unitId, state] of this.unitStates) {
      // Heroes get an extra tile shift to make room for new enemies
      const isHero = heroIds?.has(unitId) || false;
      const totalShift = isHero ? scrollDistance + 1 : scrollDistance;

      const newCol = Math.max(0, state.logicalPosition.col - totalShift);
      updates.push({
        unitId,
        newPos: { row: state.logicalPosition.row, col: newCol }
      });
    }

    // Clear all occupancy
    this.occupancyGrid.clear();

    // Apply all position updates atomically
    for (const update of updates) {
      const state = this.unitStates.get(update.unitId);
      if (!state) continue;

      state.logicalPosition = update.newPos;
      state.visualPosition = update.newPos;

      const key = this.positionKey(update.newPos);
      if (!this.occupancyGrid.has(key)) {
        this.occupancyGrid.set(key, update.unitId);
      } else {
        // Handle collision - unit gets pushed off
        console.warn(`[PositionManager] Collision during scroll for ${update.unitId}`);
        this.removeUnit(update.unitId);
      }
    }

    console.log(`[PositionManager] Wave scroll complete, moved ${updates.length} units`);
  }

  /**
   * Validate grid consistency
   */
  public validateConsistency(): string[] {
    const issues: string[] = [];

    // Check for units with mismatched positions
    for (const [unitId, state] of this.unitStates) {
      // Check if logical position matches occupancy
      const key = this.positionKey(state.logicalPosition);
      const occupant = this.occupancyGrid.get(key);

      if (occupant !== unitId && !state.isAnimating) {
        issues.push(`Unit ${unitId} at (${state.logicalPosition.row},${state.logicalPosition.col}) but grid shows ${occupant || 'empty'}`);
      }

      // Check for visual/logical mismatch when not animating
      if (!state.isAnimating && !state.targetPosition) {
        const visualKey = this.positionKey(state.visualPosition);
        const logicalKey = this.positionKey(state.logicalPosition);
        if (visualKey !== logicalKey) {
          issues.push(`Unit ${unitId} visual/logical mismatch: visual=${visualKey}, logical=${logicalKey}`);
        }
      }
    }

    // Check for orphaned occupancy entries
    for (const [key, unitId] of this.occupancyGrid) {
      if (!this.unitStates.has(unitId)) {
        issues.push(`Orphaned occupancy: ${key} -> ${unitId} (unit doesn't exist)`);
      }
    }

    return issues;
  }

  /**
   * Helper: Convert position to string key
   */
  private positionKey(pos: GridPosition): string {
    return `${pos.row},${pos.col}`;
  }

  /**
   * Helper: Check if position is valid
   * Allow col 8 for off-screen enemies
   */
  private isValidPosition(pos: GridPosition): boolean {
    return pos.row >= 0 && pos.row < this.gridHeight &&
           pos.col >= 0 && pos.col <= 8;  // Allow col 8 for off-screen
  }

  /**
   * Get all unit states (for debugging)
   */
  public getAllStates(): UnitPositionState[] {
    return Array.from(this.unitStates.values());
  }

  /**
   * Get all active transactions (for debugging)
   */
  public getActiveTransactions(): MoveTransaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.state !== 'complete' && t.state !== 'failed');
  }
}