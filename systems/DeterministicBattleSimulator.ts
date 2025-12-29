/**
 * DeterministicBattleSimulator
 *
 * Runs the entire battle simulation in memory first, recording all actions.
 * Then returns a complete action sequence that can be animated smoothly.
 *
 * This ensures:
 * 1. Single source of truth for positions
 * 2. No race conditions during animation
 * 3. Ability to preview/replay battles
 * 4. Perfect synchronization between logic and visuals
 */

import { Hero, Enemy, UnitStats } from '@/types/core.types';
import { Position } from './PositionStore';

// ============= Action Types =============
// These represent every possible action in the battle

export type BattleAction =
  | MoveAction
  | AttackAction
  | AbilityAction
  | DamageAction
  | HealAction
  | DeathAction
  | SpawnAction
  | StatusAction
  | WaveTransitionAction
  | WaveCompleteAction
  | BattleEndAction;

export interface BaseAction {
  tick: number;
  timestamp: number;
}

export interface MoveAction extends BaseAction {
  type: 'move';
  unitId: string;
  unitName: string;
  from: Position;
  to: Position;
}

export interface AttackAction extends BaseAction {
  type: 'attack';
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  damage: number;
  isCritical: boolean;
}

export interface AbilityAction extends BaseAction {
  type: 'ability';
  casterId: string;
  casterName: string;
  abilityId: string;
  abilityName: string;
  targets: string[];
}

export interface DamageAction extends BaseAction {
  type: 'damage';
  targetId: string;
  targetName: string;
  amount: number;
  source: 'attack' | 'ability' | 'dot' | 'reflect';
  remainingHp: number;
}

export interface HealAction extends BaseAction {
  type: 'heal';
  targetId: string;
  targetName: string;
  amount: number;
  source: 'ability' | 'regeneration';
  newHp: number;
}

export interface DeathAction extends BaseAction {
  type: 'death';
  unitId: string;
  unitName: string;
  position: Position;
}

export interface SpawnAction extends BaseAction {
  type: 'spawn';
  unitId: string;
  unitName: string;
  position: Position;
  isHero: boolean;
}

export interface StatusAction extends BaseAction {
  type: 'status';
  targetId: string;
  targetName: string;
  statusType: 'apply' | 'expire';
  statusName: string;
  duration?: number;
}

export interface WaveTransitionAction extends BaseAction {
  type: 'wave-transition';
  waveNumber: number;
  scrollDistance: number;
  unitMovements: Array<{
    unitId: string;
    from: Position;
    to: Position;
  }>;
}

export interface WaveCompleteAction extends BaseAction {
  type: 'wave-complete';
  waveNumber: number;
  enemiesDefeated: number;
}

export interface BattleEndAction extends BaseAction {
  type: 'battle-end';
  winner: 'heroes' | 'enemies';
  finalWave: number;
}

// ============= Battle State =============

interface UnitState {
  id: string;
  name: string;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  cooldown: number;
  isAlive: boolean;
  isHero: boolean;
}

interface BattleState {
  tick: number;
  units: Map<string, UnitState>;
  occupancy: Map<string, string>; // "row,col" -> unitId
  currentWave: number;
  totalWaves: number;
  actions: BattleAction[];
}

// ============= Simulator =============

export class DeterministicBattleSimulator {
  private state: BattleState;
  private readonly gridWidth: number = 8;
  private readonly gridHeight: number = 8;

  constructor() {
    this.state = {
      tick: 0,
      units: new Map(),
      occupancy: new Map(),
      currentWave: 1,
      totalWaves: 1,
      actions: []
    };
  }

  /**
   * Simulate an entire wave of combat
   * Returns the complete sequence of actions to animate
   */
  public simulateWave(
    heroes: Hero[],
    enemies: Enemy[],
    waveNumber: number,
    totalWaves: number
  ): BattleAction[] {
    // Reset state for new simulation
    this.state.actions = [];
    this.state.tick = 0;
    this.state.currentWave = waveNumber;
    this.state.totalWaves = totalWaves;

    // Initialize units
    this.initializeUnits(heroes, enemies);

    // Record spawn actions
    this.recordSpawnActions();

    // Run simulation until wave ends
    const maxTicks = 1000; // Safety limit
    while (this.state.tick < maxTicks) {
      this.state.tick++;

      // Process all unit actions for this tick
      const tickComplete = this.processTick();

      // Check if wave is complete
      if (tickComplete) {
        break;
      }
    }

    return this.state.actions;
  }

  /**
   * Initialize units in the battle state
   */
  private initializeUnits(heroes: Hero[], enemies: Enemy[]) {
    this.state.units.clear();
    this.state.occupancy.clear();

    // Place heroes on left side
    heroes.forEach((hero, index) => {
      const position = this.getHeroPosition(index);
      const unitState: UnitState = {
        id: hero.instanceId,
        name: hero.name,
        position,
        hp: hero.currentStats.hp,
        maxHp: hero.currentStats.maxHp,
        attack: hero.currentStats.damage,
        speed: hero.currentStats.speed,
        cooldown: 0,
        isAlive: true,
        isHero: true
      };

      this.state.units.set(hero.instanceId, unitState);
      this.setOccupancy(position, hero.instanceId);
    });

    // Place enemies on right side
    enemies.forEach((enemy, index) => {
      const position = this.getEnemyPosition(index);
      const unitState: UnitState = {
        id: enemy.instanceId,
        name: enemy.name,
        position,
        hp: enemy.currentStats.hp,
        maxHp: enemy.currentStats.maxHp,
        attack: enemy.currentStats.damage,
        speed: enemy.currentStats.speed,
        cooldown: 0,
        isAlive: true,
        isHero: false
      };

      this.state.units.set(enemy.instanceId, unitState);
      this.setOccupancy(position, enemy.instanceId);
    });
  }

  /**
   * Record spawn actions for all units
   */
  private recordSpawnActions() {
    for (const unit of this.state.units.values()) {
      this.recordAction({
        type: 'spawn',
        unitId: unit.id,
        unitName: unit.name,
        position: unit.position,
        isHero: unit.isHero,
        tick: 0,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process one tick of combat
   */
  private processTick(): boolean {
    // Get all alive units
    const aliveUnits = Array.from(this.state.units.values()).filter(u => u.isAlive);

    // Check win/loss conditions
    const aliveHeroes = aliveUnits.filter(u => u.isHero);
    const aliveEnemies = aliveUnits.filter(u => !u.isHero);

    if (aliveHeroes.length === 0) {
      this.recordAction({
        type: 'battle-end',
        winner: 'enemies',
        finalWave: this.state.currentWave,
        tick: this.state.tick,
        timestamp: Date.now()
      });
      return true;
    }

    if (aliveEnemies.length === 0) {
      this.recordAction({
        type: 'wave-complete',
        waveNumber: this.state.currentWave,
        enemiesDefeated: Array.from(this.state.units.values()).filter(u => !u.isHero).length,
        tick: this.state.tick,
        timestamp: Date.now()
      });
      return true;
    }

    // Update cooldowns
    for (const unit of aliveUnits) {
      unit.cooldown = Math.min(100, unit.cooldown + (unit.speed / 10));
    }

    // Process actions for units at 100% cooldown
    const readyUnits = aliveUnits.filter(u => u.cooldown >= 100);
    readyUnits.sort((a, b) => b.cooldown - a.cooldown); // Higher cooldown acts first

    // Track positions claimed this tick
    const reservedPositions = new Set<string>();

    for (const attacker of readyUnits) {
      // Find target
      const targets = aliveUnits.filter(u => u.isHero !== attacker.isHero);
      if (targets.length === 0) continue;

      const target = this.findClosestTarget(attacker, targets);
      if (!target) continue;

      const distance = this.getDistance(attacker.position, target.position);

      // Move or attack based on distance
      if (distance > 1) {
        // Need to move closer
        const newPosition = this.findMovePosition(attacker, target, reservedPositions);
        if (newPosition) {
          // Record move action
          this.recordAction({
            type: 'move',
            unitId: attacker.id,
            unitName: attacker.name,
            from: attacker.position,
            to: newPosition,
            tick: this.state.tick,
            timestamp: Date.now()
          });

          // Update position
          this.clearOccupancy(attacker.position);
          attacker.position = newPosition;
          this.setOccupancy(newPosition, attacker.id);
          reservedPositions.add(this.posKey(newPosition));
        }
      } else {
        // In range - attack
        const damage = this.calculateDamage(attacker, target);

        // Record attack action
        this.recordAction({
          type: 'attack',
          attackerId: attacker.id,
          attackerName: attacker.name,
          targetId: target.id,
          targetName: target.name,
          damage,
          isCritical: false,
          tick: this.state.tick,
          timestamp: Date.now()
        });

        // Apply damage
        target.hp -= damage;

        // Record damage action
        this.recordAction({
          type: 'damage',
          targetId: target.id,
          targetName: target.name,
          amount: damage,
          source: 'attack',
          remainingHp: Math.max(0, target.hp),
          tick: this.state.tick,
          timestamp: Date.now()
        });

        // Check for death
        if (target.hp <= 0) {
          target.isAlive = false;
          this.clearOccupancy(target.position);

          // Record death action
          this.recordAction({
            type: 'death',
            unitId: target.id,
            unitName: target.name,
            position: target.position,
            tick: this.state.tick,
            timestamp: Date.now()
          });
        }
      }

      // Reset cooldown after action
      attacker.cooldown = 0;
    }

    return false;
  }

  /**
   * Find the best move position towards target
   */
  private findMovePosition(
    unit: UnitState,
    target: UnitState,
    reserved: Set<string>
  ): Position | null {
    const adjacent = this.getAdjacentPositions(unit.position);

    // Sort by distance to target
    adjacent.sort((a, b) => {
      const distA = this.getDistance(a, target.position);
      const distB = this.getDistance(b, target.position);
      return distA - distB;
    });

    // Find first available position
    for (const pos of adjacent) {
      const key = this.posKey(pos);
      if (!this.state.occupancy.has(key) && !reserved.has(key)) {
        return pos;
      }
    }

    return null;
  }

  // ============= Helper Methods =============

  private getHeroPosition(index: number): Position {
    // Distribute heroes across the left side of the grid
    const heroesPerColumn = 6; // Rows 2-7 (6 rows)
    const columnOffset = Math.floor(index / heroesPerColumn);
    const rowIndex = index % heroesPerColumn;

    const row = 2 + rowIndex;
    const col = Math.min(columnOffset, 3); // Start at col 0, move right as needed, but not past col 3

    return { row: Math.min(row, 7), col };
  }

  private getEnemyPosition(index: number): Position {
    // Distribute enemies across the right side of the grid
    // Use more columns if we have too many enemies
    const enemiesPerColumn = 6; // Rows 2-7 (6 rows)
    const columnOffset = Math.floor(index / enemiesPerColumn);
    const rowIndex = index % enemiesPerColumn;

    const row = 2 + rowIndex;
    const col = Math.max(4, 7 - columnOffset); // Start at col 7, move left as needed, but not past col 4

    return { row: Math.min(row, 7), col: Math.max(col, 0) };
  }

  private posKey(pos: Position): string {
    return `${pos.row},${pos.col}`;
  }

  private setOccupancy(pos: Position, unitId: string) {
    this.state.occupancy.set(this.posKey(pos), unitId);
  }

  private clearOccupancy(pos: Position) {
    this.state.occupancy.delete(this.posKey(pos));
  }

  private getDistance(a: Position, b: Position): number {
    return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
  }

  private findClosestTarget(attacker: UnitState, targets: UnitState[]): UnitState | null {
    if (targets.length === 0) return null;

    return targets.reduce((closest, current) => {
      const closestDist = this.getDistance(attacker.position, closest.position);
      const currentDist = this.getDistance(attacker.position, current.position);
      return currentDist < closestDist ? current : closest;
    });
  }

  private getAdjacentPositions(pos: Position): Position[] {
    const positions: Position[] = [];

    for (let row = pos.row - 1; row <= pos.row + 1; row++) {
      for (let col = pos.col - 1; col <= pos.col + 1; col++) {
        if (row === pos.row && col === pos.col) continue;
        if (row >= 0 && row < this.gridHeight && col >= 0 && col < this.gridWidth) {
          positions.push({ row, col });
        }
      }
    }

    return positions;
  }

  private calculateDamage(attacker: UnitState, target: UnitState): number {
    // Simple damage calculation
    return Math.max(1, attacker.attack);
  }

  private recordAction(action: BattleAction) {
    this.state.actions.push(action);
  }

  /**
   * Simulate a wave transition (for multi-wave battles)
   */
  public simulateWaveTransition(
    remainingHeroes: Hero[],
    nextWaveEnemies: Enemy[],
    scrollDistance: number
  ): BattleAction[] {
    const transitions: BattleAction[] = [];

    // Record wave transition with unit movements
    const movements: Array<{ unitId: string; from: Position; to: Position }> = [];

    // Move heroes left
    for (const unit of this.state.units.values()) {
      if (unit.isHero && unit.isAlive) {
        const from = { ...unit.position };
        const to = {
          row: unit.position.row,
          col: Math.max(0, unit.position.col - scrollDistance - 1) // Extra tile for heroes
        };
        movements.push({ unitId: unit.id, from, to });
        unit.position = to;
      }
    }

    transitions.push({
      type: 'wave-transition',
      waveNumber: this.state.currentWave + 1,
      scrollDistance,
      unitMovements: movements,
      tick: this.state.tick,
      timestamp: Date.now()
    });

    // Add spawn actions for new enemies
    nextWaveEnemies.forEach((enemy, index) => {
      const position = this.getEnemyPosition(index);
      transitions.push({
        type: 'spawn',
        unitId: enemy.instanceId,
        unitName: enemy.name,
        position,
        isHero: false,
        tick: this.state.tick,
        timestamp: Date.now()
      });
    });

    return transitions;
  }
}