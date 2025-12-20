import { Hero, Enemy, UnitStats, StatusEffect, StatusEffectType } from '@/types/core.types';
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
  StatusApplied = 'statusApplied',
  StatusExpired = 'statusExpired',
  CriticalHit = 'criticalHit',
  Evaded = 'evaded',
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
  baseStats: UnitStats; // Original stats before buffs/debuffs
  stats: UnitStats; // Current stats (modified by status effects)
  statusEffects: StatusEffect[]; // Active buffs/debuffs
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
    // Helper to calculate position with bounds checking
    const getHeroPosition = (index: number): GridPosition => {
      return {
        row: Math.max(0, Math.min(7, 2 + Math.floor(index / 2))), // Row 2-7, capped (6 rows * 2 cols = 12 max units)
        col: Math.max(0, Math.min(7, index % 2)) // Col 0-1, capped
      };
    };

    const getEnemyPosition = (index: number): GridPosition => {
      return {
        row: Math.max(0, Math.min(7, 2 + Math.floor(index / 2))), // Row 2-7, capped (6 rows * 2 cols = 12 max units)
        col: Math.max(0, Math.min(7, 7 - (index % 2))) // Col 6-7, capped
      };
    };

    // Convert heroes and enemies to battle units
    // Heroes start on left side, spread across rows if needed
    const heroUnits: BattleUnit[] = heroes.map((h, index) => ({
      id: h.instanceId,
      name: h.name,
      class: h.class,
      spritePath: h.spritePath,
      baseStats: { ...h.currentStats },
      stats: { ...h.currentStats },
      statusEffects: [],
      isHero: true,
      isAlive: true,
      position: getHeroPosition(index),
      range: 1, // Default melee range
      cooldown: 0, // Start at 0, will fill to 100
      cooldownRate: h.currentStats.speed / 10, // Divide by 10 for slower, more visible cooldowns
    }));

    const enemyUnits: BattleUnit[] = enemies.map((e, index) => ({
      id: e.instanceId,
      name: e.name,
      spritePath: e.spritePath,
      baseStats: { ...e.currentStats },
      stats: { ...e.currentStats },
      statusEffects: [],
      isHero: false,
      isAlive: true,
      position: getEnemyPosition(index),
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
   * Clamp position to valid grid bounds (0-7)
   */
  private clampPosition(position: GridPosition): GridPosition {
    return {
      row: Math.max(0, Math.min(7, position.row)),
      col: Math.max(0, Math.min(7, position.col)),
    };
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
      // Clamp position to ensure it stays within grid bounds (extra safety check)
      const clampedMove = this.clampPosition(bestMove);

      // Double-check the clamped position is valid before assigning
      if (clampedMove.row >= 0 && clampedMove.row <= 7 &&
          clampedMove.col >= 0 && clampedMove.col <= 7) {
        unit.position = clampedMove;

        // Add movement event
        this.addEvent(BattleEventType.Move, {
          unit: unit.name,
          unitId: unit.id,
          from: oldPosition,
          to: { ...unit.position },
        });
      } else {
        // This should never happen, but log it if it does
        console.error('Attempted to move unit to invalid position:', clampedMove, 'unit:', unit.name);
      }
    }
  }

  /**
   * Process status effects (buffs, debuffs, DoT) at the start of each tick
   */
  private processStatusEffects(): void {
    const allUnits = [...this.state.heroes, ...this.state.enemies].filter(u => u.isAlive);

    for (const unit of allUnits) {
      // Process each active status effect
      for (const effect of [...unit.statusEffects]) {
        // Process DoT damage
        if (effect.damagePerTick && effect.damagePerTick > 0) {
          unit.stats.hp = Math.max(0, unit.stats.hp - effect.damagePerTick);
          this.addEvent(BattleEventType.Damage, {
            target: unit.name,
            targetId: unit.id,
            damage: effect.damagePerTick,
            remainingHp: Math.floor(unit.stats.hp),
            source: 'DoT',
            statusType: effect.statusType,
          });

          // Check for death from DoT
          if (unit.stats.hp <= 0) {
            unit.isAlive = false;
            this.addEvent(BattleEventType.Death, {
              unit: unit.name,
              unitId: unit.id,
              cause: 'DoT',
            });
          }
        }

        // Decrement duration
        effect.remainingDuration--;

        // Remove expired effects
        if (effect.remainingDuration <= 0) {
          unit.statusEffects = unit.statusEffects.filter(e => e.id !== effect.id);
          this.addEvent(BattleEventType.StatusExpired, {
            unit: unit.name,
            unitId: unit.id,
            effect: effect.name,
            statusType: effect.statusType,
          });

          // Recalculate stats after removing effect
          this.recalculateStats(unit);
        }
      }
    }
  }

  /**
   * Recalculate unit stats based on active status effects
   */
  private recalculateStats(unit: BattleUnit): void {
    // Start with base stats
    unit.stats = { ...unit.baseStats };

    // Apply all active status effects
    for (const effect of unit.statusEffects) {
      if (effect.stat && effect.value !== undefined) {
        const currentValue = unit.stats[effect.stat] as number;

        if (effect.isPercent) {
          // Percentage modifier
          unit.stats[effect.stat] = currentValue * (1 + effect.value / 100) as any;
        } else {
          // Flat modifier
          unit.stats[effect.stat] = Math.max(0, currentValue + effect.value) as any;
        }
      }

      // Handle shield amounts (additive)
      if (effect.shieldAmount && effect.shieldAmount > 0) {
        // Shields are separate from HP but absorb damage first (not implemented in this version)
        // For now, we'll just track them
      }
    }

    // Update cooldown rate based on new speed
    unit.cooldownRate = unit.stats.speed / 10;
  }

  /**
   * Apply a status effect to a unit
   */
  private applyStatusEffect(unit: BattleUnit, statusType: StatusEffectType, duration: number, options?: {
    damagePerTick?: number;
    stat?: keyof UnitStats;
    value?: number;
    isPercent?: boolean;
  }): void {
    const effect: StatusEffect = {
      id: `${statusType}_${Date.now()}_${Math.random()}`,
      name: statusType,
      type: this.getStatusEffectCategory(statusType),
      statusType,
      duration,
      remainingDuration: duration,
      ...options,
    };

    unit.statusEffects.push(effect);

    this.addEvent(BattleEventType.StatusApplied, {
      unit: unit.name,
      unitId: unit.id,
      effect: effect.name,
      statusType: effect.statusType,
      duration,
    });

    // Recalculate stats immediately
    this.recalculateStats(unit);
  }

  /**
   * Determine status effect category
   */
  private getStatusEffectCategory(statusType: StatusEffectType): 'buff' | 'debuff' | 'control' | 'dot' | 'special' {
    const controlEffects = [StatusEffectType.Stun, StatusEffectType.Root, StatusEffectType.Silence,
                           StatusEffectType.Disarm, StatusEffectType.Fear, StatusEffectType.Charm,
                           StatusEffectType.Sleep];
    const dotEffects = [StatusEffectType.Poison, StatusEffectType.Burn, StatusEffectType.Bleed];
    const buffEffects = [StatusEffectType.Shield, StatusEffectType.Regeneration, StatusEffectType.Enrage,
                        StatusEffectType.Frenzy, StatusEffectType.Fortify, StatusEffectType.Haste,
                        StatusEffectType.Invisibility, StatusEffectType.Incorporeal];
    const debuffEffects = [StatusEffectType.Slow, StatusEffectType.ArmorBreak, StatusEffectType.Weakened,
                          StatusEffectType.Vulnerable, StatusEffectType.Disease, StatusEffectType.Curse,
                          StatusEffectType.Terror, StatusEffectType.Marked];

    if (controlEffects.includes(statusType)) return 'control';
    if (dotEffects.includes(statusType)) return 'dot';
    if (buffEffects.includes(statusType)) return 'buff';
    if (debuffEffects.includes(statusType)) return 'debuff';
    return 'special';
  }

  /**
   * Check if unit is stunned/disabled (cannot act)
   */
  private isUnitDisabled(unit: BattleUnit): boolean {
    return unit.statusEffects.some(e =>
      e.statusType === StatusEffectType.Stun ||
      e.statusType === StatusEffectType.Sleep ||
      e.statusType === StatusEffectType.Fear
    );
  }

  /**
   * Process one tick of combat
   * Advances all unit cooldowns and triggers actions for units at 100%
   */
  private processTick(): void {
    this.state.tick++;

    // Process status effects first (DoT, expiration, etc.)
    this.processStatusEffects();

    // Check if battle ended from status effects
    if (this.checkBattleEnd()) {
      return;
    }

    // Get all alive units
    const allUnits = [...this.state.heroes, ...this.state.enemies].filter(u => u.isAlive);

    // Safety check: Ensure all unit positions are within bounds
    // This catches any edge cases where positions might have gone out of bounds
    for (const unit of allUnits) {
      unit.position = this.clampPosition(unit.position);
    }

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

      // Check if unit is disabled (stunned, sleeping, etc.)
      if (this.isUnitDisabled(attacker)) {
        // Skip turn but reset cooldown
        attacker.cooldown = 0;
        continue;
      }

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
      // Check for evasion first
      const evasionRoll = Math.random();
      const hitChance = attacker.stats.accuracy || 0.95;
      const evasionChance = target.stats.evasion || 0.05;
      const finalEvasionChance = Math.max(0, Math.min(0.95, evasionChance - (1 - hitChance)));

      if (evasionRoll < finalEvasionChance) {
        // Attack evaded!
        this.addEvent(BattleEventType.Evaded, {
          attacker: attacker.name,
          attackerId: attacker.id,
          target: target.name,
          targetId: target.id,
        });

        // Reset cooldown after missing
        attacker.cooldown = 0;
        continue;
      }

      // Calculate damage
      let baseDamage = attacker.stats.damage;
      const defense = target.stats.defense || 0;
      const penetration = attacker.stats.penetration || 0;

      // Apply armor penetration
      const effectiveDefense = defense * (1 - penetration);

      // Check for critical hit
      const critRoll = Math.random();
      const isCrit = critRoll < (attacker.stats.critChance || 0.1);

      if (isCrit) {
        baseDamage *= attacker.stats.critDamage || 1.5;
        this.addEvent(BattleEventType.CriticalHit, {
          attacker: attacker.name,
          attackerId: attacker.id,
          target: target.name,
          targetId: target.id,
        });
      }

      const damage = Math.max(1, baseDamage - effectiveDefense * 0.5);

      // Apply damage
      target.stats.hp = Math.max(0, target.stats.hp - damage);

      this.addEvent(BattleEventType.Attack, {
        attacker: attacker.name,
        attackerId: attacker.id,
        target: target.name,
        targetId: target.id,
        isCrit,
      });

      this.addEvent(BattleEventType.Damage, {
        target: target.name,
        targetId: target.id,
        damage: Math.floor(damage),
        remainingHp: Math.floor(target.stats.hp),
      });

      // Apply lifesteal
      if (attacker.stats.lifesteal && attacker.stats.lifesteal > 0) {
        const healAmount = damage * attacker.stats.lifesteal;
        attacker.stats.hp = Math.min(attacker.baseStats.maxHp, attacker.stats.hp + healAmount);
        this.addEvent(BattleEventType.Heal, {
          unit: attacker.name,
          unitId: attacker.id,
          amount: Math.floor(healAmount),
          source: 'lifesteal',
        });
      }

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
