import { Hero, Enemy, UnitStats } from '@/types/core.types';
import { GridPosition } from '@/types/grid.types';

// Battle event types
export enum BattleEventType {
  BattleStart = 'battleStart',
  Tick = 'tick', // Replaces TurnStart - fires each tick with cooldown updates
  Move = 'move',
  Attack = 'attack',
  Damage = 'damage',
  Heal = 'heal',
  Death = 'death',
  Victory = 'victory',
  Defeat = 'defeat',
}

export interface BattleEvent {
  type: BattleEventType;
  timestamp: number;
  data: any;
}

export interface BattleUnit {
  id: string;
  name: string;
  class?: string;
  spritePath?: string;
  stats: UnitStats;
  isHero: boolean;
  isAlive: boolean;
  position: GridPosition;
  range: number; // Attack range (1 = melee, 2+ = ranged)
  cooldown: number; // Current cooldown (0-100, acts at 100)
  cooldownRate: number; // How much cooldown fills per tick (based on speed)
}

export interface BattleState {
  tick: number; // Battle time in ticks (replaces turn-based system)
  heroes: BattleUnit[];
  enemies: BattleUnit[];
  events: BattleEvent[];
  winner: 'heroes' | 'enemies' | null;
}

/**
 * Cooldown-based battle simulator (like The Bazaar)
 * Units act when their cooldown reaches 100%
 * Speed determines how fast cooldown fills
 */
export class BattleSimulator {
  private state: BattleState;

  constructor(heroes: Hero[], enemies: Enemy[]) {
    // Convert heroes and enemies to battle units
    // Heroes start on left side, spread across rows if needed
    const heroUnits: BattleUnit[] = heroes.map((h, index) => ({
      id: h.instanceId,
      name: h.name,
      class: h.class,
      spritePath: h.spritePath,
      stats: { ...h.currentStats },
      isHero: true,
      isAlive: true,
      position: {
        row: 3 + Math.floor(index / 2), // Row 3-5 (spread vertically)
        col: index % 2 // Col 0-1
      },
      range: 1, // Default melee range
      cooldown: 0, // Start at 0, will fill to 100
      cooldownRate: h.currentStats.speed / 10, // Divide by 10 for slower, more visible cooldowns
    }));

    const enemyUnits: BattleUnit[] = enemies.map((e, index) => ({
      id: e.instanceId,
      name: e.name,
      spritePath: e.spritePath,
      stats: { ...e.currentStats },
      isHero: false,
      isAlive: true,
      position: {
        row: 3 + Math.floor(index / 2), // Row 3-5 (spread vertically)
        col: 7 - (index % 2) // Col 6-7
      },
      range: 1, // Default melee range
      cooldown: 0, // Start at 0, will fill to 100
      cooldownRate: e.currentStats.speed / 10, // Divide by 10 for slower, more visible cooldowns
    }));

    this.state = {
      tick: 0,
      heroes: heroUnits,
      enemies: enemyUnits,
      events: [],
      winner: null,
    };

    this.addEvent(BattleEventType.BattleStart, {
      heroes: heroUnits.map((h) => h.name),
      enemies: enemyUnits.map((e) => e.name),
    });
  }

  /**
   * Run the entire battle simulation
   * Returns the final battle state with all events
   */
  simulate(): BattleState {
    let maxTicks = 1000; // Prevent infinite loops (1000 ticks should be plenty)
    let tickCount = 0;

    while (!this.state.winner && tickCount < maxTicks) {
      this.processTick();
      tickCount++;
    }

    if (!this.state.winner) {
      // Timeout - count remaining HP
      const heroHp = this.state.heroes.reduce((sum, h) => sum + h.stats.hp, 0);
      const enemyHp = this.state.enemies.reduce((sum, e) => sum + e.stats.hp, 0);
      this.state.winner = heroHp > enemyHp ? 'heroes' : 'enemies';
    }

    return this.state;
  }

  /**
   * Calculate distance between two positions (Chebyshev distance - allows diagonals)
   * This means units can attack diagonally, so range 1 = all 8 adjacent squares
   */
  private getDistance(pos1: GridPosition, pos2: GridPosition): number {
    // Chebyshev distance: max of horizontal and vertical distance
    // This allows diagonal movement/attacks
    return Math.max(Math.abs(pos1.col - pos2.col), Math.abs(pos1.row - pos2.row));
  }

  /**
   * Check if a position is occupied by another unit
   */
  private isPositionOccupied(position: GridPosition, excludeUnit?: BattleUnit): boolean {
    const allUnits = [...this.state.heroes, ...this.state.enemies].filter(u => u.isAlive);
    return allUnits.some(u =>
      u !== excludeUnit &&
      u.position.row === position.row &&
      u.position.col === position.col
    );
  }

  /**
   * Move unit closer to target, avoiding occupied spaces
   * Uses improved pathfinding that can navigate around obstacles
   */
  private moveTowards(unit: BattleUnit, target: BattleUnit): void {
    const oldPosition = { ...unit.position };

    // Try all 8 adjacent positions (including diagonals)
    const allPossibleMoves: GridPosition[] = [
      // Cardinal directions
      { row: unit.position.row, col: unit.position.col + 1 }, // Right
      { row: unit.position.row, col: unit.position.col - 1 }, // Left
      { row: unit.position.row + 1, col: unit.position.col }, // Down
      { row: unit.position.row - 1, col: unit.position.col }, // Up
      // Diagonals
      { row: unit.position.row + 1, col: unit.position.col + 1 }, // Down-Right
      { row: unit.position.row + 1, col: unit.position.col - 1 }, // Down-Left
      { row: unit.position.row - 1, col: unit.position.col + 1 }, // Up-Right
      { row: unit.position.row - 1, col: unit.position.col - 1 }, // Up-Left
    ];

    // Filter out occupied positions and positions outside grid bounds (0-7)
    const validMoves = allPossibleMoves.filter(pos => {
      const inBounds = pos.row >= 0 && pos.row <= 7 && pos.col >= 0 && pos.col <= 7;
      const notOccupied = !this.isPositionOccupied(pos, unit);
      return inBounds && notOccupied;
    });

    if (validMoves.length === 0) {
      // No valid moves, unit is blocked
      return;
    }

    const currentDist = this.getDistance(unit.position, target.position);

    // Score each valid move based on:
    // 1. Distance to target (primary factor)
    // 2. Whether it moves us closer (bonus)
    // 3. Alignment with target direction (bonus for moving in the right general direction)
    const scoredMoves = validMoves.map(move => {
      const distToTarget = this.getDistance(move, target.position);
      const getsCloser = distToTarget < currentDist;

      // Calculate directional alignment (are we moving towards target?)
      const toTargetRow = target.position.row - unit.position.row;
      const toTargetCol = target.position.col - unit.position.col;
      const moveRow = move.row - unit.position.row;
      const moveCol = move.col - unit.position.col;

      // Dot product-like alignment: positive if moving in right direction
      const alignment = (moveRow * toTargetRow) + (moveCol * toTargetCol);

      // Score: lower is better
      // - Distance is primary factor (multiply by 100 for priority)
      // - Subtract bonus for getting closer
      // - Subtract alignment bonus (scaled down)
      const score = (distToTarget * 100) - (getsCloser ? 50 : 0) - (alignment * 10);

      return { move, score, distToTarget };
    });

    // Sort by score (lower is better)
    scoredMoves.sort((a, b) => a.score - b.score);
    const bestMove = scoredMoves[0].move;
    const newDist = scoredMoves[0].distToTarget;

    // Move if:
    // 1. We get closer, OR
    // 2. We maintain distance but move towards target (allows sideways movement around obstacles)
    // 3. As last resort, move even if we get slightly farther (max +1 distance) to escape dead ends
    const distIncrease = newDist - currentDist;
    const shouldMove = distIncrease <= 1; // Allow moving up to 1 step farther to navigate around obstacles

    if (shouldMove) {
      unit.position = bestMove;

      // Add movement event
      this.addEvent(BattleEventType.Move, {
        unit: unit.name,
        unitId: unit.id,
        from: oldPosition,
        to: { ...unit.position },
      });
    }
  }

  /**
   * Process one tick of combat
   * Advances all unit cooldowns and triggers actions for units at 100%
   */
  private processTick(): void {
    this.state.tick++;

    // Get all alive units
    const allUnits = [...this.state.heroes, ...this.state.enemies].filter(u => u.isAlive);

    // Advance cooldowns for all units
    const cooldownUpdates: any[] = [];
    for (const unit of allUnits) {
      unit.cooldown = Math.min(100, unit.cooldown + unit.cooldownRate);
      cooldownUpdates.push({
        unitId: unit.id,
        cooldown: unit.cooldown,
      });
    }

    // Add tick event with cooldown updates
    this.addEvent(BattleEventType.Tick, {
      tick: this.state.tick,
      cooldowns: cooldownUpdates,
    });

    // Find all units ready to act (cooldown >= 100)
    const readyUnits = allUnits.filter(u => u.cooldown >= 100);

    // Sort by highest cooldown first (in case multiple units are ready)
    readyUnits.sort((a, b) => b.cooldown - a.cooldown);

    // Process each ready unit's action
    for (const attacker of readyUnits) {
      if (!attacker.isAlive) continue;

      // Check if battle is already over
      if (this.checkBattleEnd()) {
        return;
      }

      // Find target (closest alive enemy)
      const targets = attacker.isHero
        ? this.state.enemies.filter((e) => e.isAlive)
        : this.state.heroes.filter((h) => h.isAlive);

      if (targets.length === 0) continue;

      // Find closest target
      const target = targets.reduce((closest, current) => {
        const closestDist = this.getDistance(attacker.position, closest.position);
        const currentDist = this.getDistance(attacker.position, current.position);
        return currentDist < closestDist ? current : closest;
      });

      const distance = this.getDistance(attacker.position, target.position);

      // Move towards target if out of range
      if (distance > attacker.range) {
        this.moveTowards(attacker, target);
        // Reset cooldown after moving
        attacker.cooldown = 0;
        continue;
      }

      // In range - attack!
      const baseDamage = attacker.stats.damage;
      const defense = target.stats.defense || 0;
      const damage = Math.max(1, baseDamage - defense * 0.5);

      // Apply damage
      target.stats.hp = Math.max(0, target.stats.hp - damage);

      this.addEvent(BattleEventType.Attack, {
        attacker: attacker.name,
        attackerId: attacker.id,
        target: target.name,
        targetId: target.id,
      });

      this.addEvent(BattleEventType.Damage, {
        target: target.name,
        targetId: target.id,
        damage: Math.floor(damage),
        remainingHp: Math.floor(target.stats.hp),
      });

      // Reset cooldown after attacking
      attacker.cooldown = 0;

      // Check if target died
      if (target.stats.hp <= 0) {
        target.isAlive = false;
        this.addEvent(BattleEventType.Death, {
          unit: target.name,
          unitId: target.id,
        });

        // Check if battle ended
        if (this.checkBattleEnd()) {
          return;
        }
      }
    }
  }

  /**
   * Check if battle has ended
   * Returns true if battle is over
   */
  private checkBattleEnd(): boolean {
    const heroesAlive = this.state.heroes.some((h) => h.isAlive);
    const enemiesAlive = this.state.enemies.some((e) => e.isAlive);

    if (!heroesAlive) {
      this.state.winner = 'enemies';
      this.addEvent(BattleEventType.Defeat, {});
      return true;
    }

    if (!enemiesAlive) {
      this.state.winner = 'heroes';
      this.addEvent(BattleEventType.Victory, {});
      return true;
    }

    return false;
  }

  /**
   * Add event to battle log
   */
  private addEvent(type: BattleEventType, data: any): void {
    this.state.events.push({
      type,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Get current battle state
   */
  getState(): BattleState {
    return this.state;
  }
}
