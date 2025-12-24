import { Hero, Enemy, UnitStats, StatusEffect, StatusEffectType, Ability, AbilityType } from '@/types/core.types';
import { GridPosition } from '@/types/grid.types';
import { GridManager } from './GridManager';

// Battle event types
export enum BattleEventType {
  BattleStart = 'battleStart',
  WaveComplete = 'waveComplete', // Wave completed - pause for player decision
  WaveStart = 'waveStart', // New wave of enemies entering
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
  AbilityUsed = 'abilityUsed', // When a unit uses an ability
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
  abilities: Ability[]; // Available abilities
  abilityCooldowns: Map<string, number>; // Track cooldowns for each ability by ID
  wave?: number; // Which wave this enemy belongs to (1-indexed, undefined for heroes)
}

export interface BattleState {
  tick: number; // Battle time in ticks (replaces turn-based system)
  heroes: BattleUnit[];
  enemies: BattleUnit[];
  events: BattleEvent[];
  winner: 'heroes' | 'enemies' | null;
  currentWave: number; // Current wave number (1-indexed)
  totalWaves: number; // Total number of waves in battle
  enemyWaves: Enemy[][]; // Remaining waves of enemies to spawn
}

/**
 * Cooldown-based battle simulator (like The Bazaar)
 * Units act when their cooldown reaches 100%
 * Speed determines how fast cooldown fills
 */
export class BattleSimulator {
  private state: BattleState;
  private gridManager: GridManager; // Single source of truth for grid occupancy

  constructor(heroes: Hero[], enemies: Enemy[] | Enemy[][]) {
    // Initialize grid manager (8x8 grid)
    this.gridManager = new GridManager(8, 8);

    // Check if enemies is a wave array (array of arrays) or single wave
    // Multi-wave format: enemies[0] is an array (Enemy[])
    // Single-wave format: enemies[0] is an Enemy object with currentStats
    const isMultiWave = Array.isArray(enemies[0]);
    const enemyWaves: Enemy[][] = isMultiWave ? (enemies as Enemy[][]) : [enemies as Enemy[]];
    const firstWave = enemyWaves[0];

    // Helper to calculate position with bounds checking
    // Spreads units across rows in a 2-column layout to avoid stacking
    const getHeroPosition = (index: number): GridPosition => {
      // Use 2 columns (0 and 1), spread across rows 2-7 (6 rows available)
      // Max 12 heroes can fit comfortably (6 rows × 2 columns)
      const row = 2 + Math.floor(index / 2); // Start at row 2, each row fits 2 units
      const col = index % 2; // Alternate between col 0 and 1

      // If we have more than 12 heroes (overflow past row 7), wrap to row 0-1
      if (row > 7) {
        const overflowIndex = index - 12; // How many past the first 12
        return {
          row: Math.floor(overflowIndex / 2), // Use rows 0-1 for overflow
          col: overflowIndex % 2
        };
      }

      return { row, col };
    };

    const getEnemyPosition = (index: number): GridPosition => {
      // Use 2 columns (6 and 7), spread across rows 2-7 (6 rows available)
      // Max 12 enemies can fit comfortably (6 rows × 2 columns)
      const row = 2 + Math.floor(index / 2); // Start at row 2, each row fits 2 units
      const col = 7 - (index % 2); // Alternate between col 7 and 6

      // If we have more than 12 enemies (overflow past row 7), wrap to row 0-1
      if (row > 7) {
        const overflowIndex = index - 12; // How many past the first 12
        return {
          row: Math.floor(overflowIndex / 2), // Use rows 0-1 for overflow
          col: 7 - (overflowIndex % 2)
        };
      }

      return { row, col };
    };

    // Convert heroes and enemies to battle units
    // Heroes start on left side, spread across rows if needed
    const heroUnits: BattleUnit[] = heroes.map((h, index) => {
      const position = getHeroPosition(index);

      // Initialize ability cooldowns map
      const abilityCooldowns = new Map<string, number>();
      h.abilities.forEach(ability => {
        abilityCooldowns.set(ability.id, 0); // All abilities start ready
      });

      // Determine initial range based on abilities
      // If hero has ranged abilities, set range to max ability range
      const maxAbilityRange = h.abilities.length > 0
        ? Math.max(...h.abilities.map(a => a.range || 1))
        : 1;

      return {
        id: h.instanceId,
        name: h.name,
        class: h.class,
        spritePath: h.spritePath,
        baseStats: { ...h.currentStats },
        stats: { ...h.currentStats },
        statusEffects: [],
        isHero: true,
        isAlive: true,
        position,
        range: maxAbilityRange, // Set range based on abilities
        cooldown: 0, // Start at 0, will fill to 100
        cooldownRate: h.currentStats.speed / 10, // Divide by 10 for slower, more visible cooldowns
        abilities: h.abilities.map(a => ({ ...a })), // Copy abilities
        abilityCooldowns,
      };
    });

    const enemyUnits: BattleUnit[] = firstWave.map((e, index) => {
      const position = getEnemyPosition(index);

      // Initialize ability cooldowns map (enemies may have abilities too)
      const abilityCooldowns = new Map<string, number>();
      const enemyAbilities = e.abilities || [];
      enemyAbilities.forEach(ability => {
        abilityCooldowns.set(ability.id, 0); // All abilities start ready
      });

      // Determine initial range based on abilities
      const maxAbilityRange = enemyAbilities.length > 0
        ? Math.max(...enemyAbilities.map(a => a.range || 1))
        : 1;

      return {
        id: e.instanceId,
        name: e.name,
        spritePath: e.spritePath,
        baseStats: { ...e.currentStats },
        stats: { ...e.currentStats },
        statusEffects: [],
        isHero: false,
        isAlive: true,
        position,
        range: maxAbilityRange, // Set range based on abilities
        cooldown: 0, // Start at 0, will fill to 100
        cooldownRate: e.currentStats.speed / 10, // Divide by 10 for slower, more visible cooldowns
        abilities: enemyAbilities.map(a => ({ ...a })), // Copy abilities
        abilityCooldowns,
        wave: 1, // First wave enemies
      };
    });

    // Register all units with GridManager
    const allUnits = [...heroUnits, ...enemyUnits];
    allUnits.forEach(unit => {
      const occupied = this.gridManager.occupy(unit.position, unit.id);
      if (!occupied) {
        console.error(`[BattleSimulator] Failed to occupy position for unit ${unit.name} at`, unit.position);
        // Find nearest empty tile as fallback
        const nearestEmpty = this.gridManager.findNearestEmptyTile(unit.position);
        if (nearestEmpty) {
          console.log(`[BattleSimulator] Moving ${unit.name} to nearest empty tile:`, nearestEmpty);
          unit.position = nearestEmpty;
          this.gridManager.occupy(nearestEmpty, unit.id);
        }
      }
    });

    this.state = {
      tick: 0,
      heroes: heroUnits,
      enemies: enemyUnits,
      events: [],
      winner: null,
      currentWave: 1,
      totalWaves: enemyWaves.length,
      enemyWaves: enemyWaves.slice(1), // Store remaining waves (skip first wave already spawned)
    };

    console.log('[BattleSimulator] Initialized with:', {
      heroes: heroUnits.length,
      wave1Enemies: enemyUnits.length,
      totalWaves: enemyWaves.length,
      remainingWaves: enemyWaves.slice(1).length,
      allEnemiesInState: enemyUnits.map(e => ({ name: e.name, wave: e.wave, pos: e.position }))
    });

    this.addEvent(BattleEventType.BattleStart, {
      heroes: heroUnits.map((h) => h.name),
      enemies: enemyUnits.map((e) => e.name),
      totalWaves: enemyWaves.length,
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
   * Move unit closer to target, avoiding occupied spaces
   * Uses GridManager for collision-aware pathfinding
   */
  private moveTowards(unit: BattleUnit, target: BattleUnit): void {
    const oldPosition = { ...unit.position };

    // Get all valid adjacent positions (8-directional)
    const allPossibleMoves = this.gridManager.getAdjacentPositionsWithDiagonals(unit.position);

    // Filter to walkable positions only (GridManager checks bounds and occupancy)
    const validMoves = allPossibleMoves.filter(pos => this.gridManager.isWalkable(pos, unit.id));

    if (validMoves.length === 0) {
      // No valid moves, unit is completely blocked
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
      // Attempt atomic move through GridManager
      const moveSuccess = this.gridManager.move(unit.id, oldPosition, bestMove);

      if (moveSuccess) {
        // Update unit's actual position
        unit.position = bestMove;

        // Add movement event
        this.addEvent(BattleEventType.Move, {
          unit: unit.name,
          unitId: unit.id,
          from: oldPosition,
          to: { ...unit.position },
        });
      }
      // If move failed, unit stays in place (tile became occupied between checks)
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
            // Vacate grid position in GridManager
            this.gridManager.vacate(unit.position);
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
    // Preserve current HP before recalculating
    const currentHp = unit.stats.hp;

    // Start with base stats
    unit.stats = { ...unit.baseStats };

    // Restore current HP (don't reset HP when recalculating)
    unit.stats.hp = currentHp;

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
   * Decrement ability cooldowns after a unit takes an action
   */
  private decrementAbilityCooldowns(unit: BattleUnit): void {
    unit.abilityCooldowns.forEach((cooldown, abilityId) => {
      if (cooldown > 0) {
        unit.abilityCooldowns.set(abilityId, cooldown - 1);
      }
    });
  }

  /**
   * Get the maximum range of any ready ability the unit has
   * Returns the longest range of ready abilities, or 1 (melee) if no abilities are ready
   */
  private getEffectiveRange(unit: BattleUnit): number {
    // Check if unit has any abilities
    if (unit.abilities.length === 0) {
      return 1; // No abilities, basic melee range
    }

    // Find ready offensive abilities
    const readyAbilities = unit.abilities.filter(ability => {
      const cooldown = unit.abilityCooldowns.get(ability.id) || 0;
      return cooldown === 0 && ability.type === AbilityType.Offensive;
    });

    if (readyAbilities.length === 0) {
      return 1; // No ready abilities, fall back to basic melee attack range
    }

    // Return the maximum range of ready abilities
    const maxAbilityRange = Math.max(...readyAbilities.map(a => a.range || 1));
    return maxAbilityRange;
  }

  /**
   * Attempt to use an ability if one is available and ready
   * Returns true if an ability was used, false otherwise
   */
  private tryUseAbility(attacker: BattleUnit, targets: BattleUnit[]): boolean {
    // Check if unit has any abilities
    if (attacker.abilities.length === 0) {
      return false;
    }

    // Find all ready abilities (both offensive and support)
    const readyAbilities = attacker.abilities.filter(ability => {
      const cooldown = attacker.abilityCooldowns.get(ability.id) || 0;
      return cooldown === 0;
    });

    if (readyAbilities.length === 0) {
      return false;
    }

    // Prioritize support/heal abilities if allies need healing
    const supportAbilities = readyAbilities.filter(a => a.type === AbilityType.Support);
    if (supportAbilities.length > 0) {
      // Check if any heal abilities are available
      const healAbilities = supportAbilities.filter(a =>
        a.effects.some(e => e.type === 'heal')
      );

      if (healAbilities.length > 0) {
        // Check if any allies need healing (below 99% HP - heal even minor damage)
        const allies = attacker.isHero
          ? this.state.heroes.filter(h => h.isAlive)
          : this.state.enemies.filter(e => e.isAlive);

        const needsHealing = allies.some(ally =>
          ally.stats.hp < ally.baseStats.maxHp * 0.99
        );

        // If allies need healing, prioritize heal abilities
        if (needsHealing) {
          const ability = healAbilities[0];

          // Log ability usage FIRST (so animation starts before effects)
          this.addEvent(BattleEventType.AbilityUsed, {
            attacker: attacker.name,
            attackerId: attacker.id,
            abilityName: ability.name,
            abilityId: ability.id,
          });

          // Process heal effects
          let abilityActuallyUsed = false;
          for (const effect of ability.effects) {
            if (effect.type === 'heal') {
              // Heal allies
              abilityActuallyUsed = true;

              const healAmount = effect.value || 0;
              for (const ally of allies) {
                const actualHeal = Math.min(healAmount, ally.baseStats.maxHp - ally.stats.hp);
                if (actualHeal > 0) {
                  ally.stats.hp = Math.min(ally.baseStats.maxHp, ally.stats.hp + healAmount);
                  this.addEvent(BattleEventType.Heal, {
                    unit: ally.name,
                    unitId: ally.id,
                    amount: Math.floor(actualHeal),
                    source: 'ability',
                    abilityName: ability.name,
                  });
                }
              }
            }
          }

          // Only use ability if it actually affected something
          if (abilityActuallyUsed) {
            // Set ability cooldown
            attacker.abilityCooldowns.set(ability.id, ability.cooldown);
            return true;
          }
        }
      }
    }

    // Otherwise use offensive abilities
    const offensiveAbilities = readyAbilities.filter(a => a.type === AbilityType.Offensive);
    if (offensiveAbilities.length === 0) {
      return false;
    }

    // Use the first ready offensive ability
    const ability = offensiveAbilities[0];

    // Log ability usage FIRST (so animation starts before effects)
    this.addEvent(BattleEventType.AbilityUsed, {
      attacker: attacker.name,
      attackerId: attacker.id,
      abilityName: ability.name,
      abilityId: ability.id,
    });

    // Process ability effects
    let abilityActuallyUsed = false;
    for (const effect of ability.effects) {
      if (effect.type === 'damage') {
        // Determine targets based on target type
        let affectedTargets: BattleUnit[] = [];

        if (effect.targetType === 'enemy') {
          // Single target - find closest
          affectedTargets = [targets.reduce((closest, current) => {
            const closestDist = this.getDistance(attacker.position, closest.position);
            const currentDist = this.getDistance(attacker.position, current.position);
            return currentDist < closestDist ? current : closest;
          })];
        } else if (effect.targetType === 'aoe' && effect.radius) {
          // Special handling for blade_cleave - cleave arc pattern
          if (ability.id === 'blade_cleave') {
            // Blade cleave: hit 1 adjacent enemy, then up to 2 enemies adjacent to that enemy AND the hero
            const primaryTarget = targets.reduce((closest, current) => {
              const closestDist = this.getDistance(attacker.position, closest.position);
              const currentDist = this.getDistance(attacker.position, current.position);
              return currentDist < closestDist ? current : closest;
            });

            // Start with primary target (must be adjacent to hero)
            if (this.getDistance(attacker.position, primaryTarget.position) <= 1) {
              affectedTargets.push(primaryTarget);

              // Find up to 2 additional targets that are:
              // 1. Adjacent to the primary target (distance <= 1)
              // 2. Also adjacent to the hero (distance <= 1)
              const secondaryTargets = targets.filter(t => {
                if (t.id === primaryTarget.id) return false; // Don't include primary target again
                const adjacentToPrimary = this.getDistance(t.position, primaryTarget.position) <= 1;
                const adjacentToHero = this.getDistance(t.position, attacker.position) <= 1;
                return adjacentToPrimary && adjacentToHero;
              });

              // Add up to 2 secondary targets
              affectedTargets.push(...secondaryTargets.slice(0, 2));
            }
          } else if (ability.id === 'fireball') {
            // Special handling for fireball - 2x2 area instead of circular radius
            const abilityRange = ability.range || 1;

            // Filter targets within range
            const targetsInRange = targets.filter(t => {
              const dist = this.getDistance(attacker.position, t.position);
              return dist <= abilityRange;
            });

            if (targetsInRange.length > 0) {
              // Find closest target within range
              const primaryTarget = targetsInRange.reduce((closest, current) => {
                const closestDist = this.getDistance(attacker.position, closest.position);
                const currentDist = this.getDistance(attacker.position, current.position);
                return currentDist < closestDist ? current : closest;
              });

              // Apply 2x2 area effect centered on primary target
              const fireballTiles = [
                primaryTarget.position,
                { row: primaryTarget.position.row + 1, col: primaryTarget.position.col },
                { row: primaryTarget.position.row, col: primaryTarget.position.col + 1 },
                { row: primaryTarget.position.row + 1, col: primaryTarget.position.col + 1 },
              ];

              affectedTargets = targets.filter(t =>
                fireballTiles.some(tile => tile.row === t.position.row && tile.col === t.position.col)
              );
            }
          } else {
            // Standard AOE - find targets within range, then apply AOE around closest
            const abilityRange = ability.range || 1; // Default to melee range

            // Filter targets that are within the ability's range
            const targetsInRange = targets.filter(t => {
              const dist = this.getDistance(attacker.position, t.position);
              return dist <= abilityRange;
            });

            if (targetsInRange.length > 0) {
              // Find closest target within range
              const primaryTarget = targetsInRange.reduce((closest, current) => {
                const closestDist = this.getDistance(attacker.position, closest.position);
                const currentDist = this.getDistance(attacker.position, current.position);
                return currentDist < closestDist ? current : closest;
              });

              // Apply AOE effect to all enemies within radius of the primary target
              affectedTargets = targets.filter(t => {
                const dist = this.getDistance(primaryTarget.position, t.position);
                return dist <= (effect.radius || 0);
              });
            }
          }
        }

        // If no targets were affected, ability cannot be used
        if (affectedTargets.length === 0) {
          return false;
        }

        // Mark ability as actually used (targets found)
        abilityActuallyUsed = true;

        // Apply damage to all affected targets
        let totalDamageDealt = 0; // Track total damage for lifesteal calculation
        for (const target of affectedTargets) {
          const damage = effect.value || 0;
          target.stats.hp = Math.max(0, target.stats.hp - damage);
          totalDamageDealt += damage;

          this.addEvent(BattleEventType.Damage, {
            target: target.name,
            targetId: target.id,
            damage: Math.floor(damage),
            remainingHp: Math.floor(target.stats.hp),
            source: 'ability',
            abilityName: ability.name,
          });

          // Check for death
          if (target.stats.hp <= 0) {
            target.isAlive = false;
            // Vacate grid position in GridManager
            this.gridManager.vacate(target.position);
            this.addEvent(BattleEventType.Death, {
              unit: target.name,
              unitId: target.id,
            });
          }
        }

        // Check if ability has a lifesteal effect (separate effect in the effects array)
        const lifestealEffect = ability.effects.find(e => e.type === 'lifesteal');
        if (lifestealEffect && lifestealEffect.value && totalDamageDealt > 0) {
          const healAmount = totalDamageDealt * lifestealEffect.value;
          attacker.stats.hp = Math.min(attacker.baseStats.maxHp, attacker.stats.hp + healAmount);
          this.addEvent(BattleEventType.Heal, {
            unit: attacker.name,
            unitId: attacker.id,
            amount: Math.floor(healAmount),
            source: 'ability_lifesteal',
            abilityName: ability.name,
          });
        }
      } else if (effect.type === 'lifesteal') {
        // Lifesteal effect is handled with damage effect above
        // Mark as used so ability triggers
        abilityActuallyUsed = true;
      } else if (effect.type === 'status' && effect.statusType && effect.duration) {
        // Apply status effect - can be single target or AOE
        let affectedTargets: BattleUnit[] = [];

        if (effect.targetType === 'aoe') {
          if (ability.id === 'fireball') {
            // Special handling for fireball - 2x2 area
            const abilityRange = ability.range || 1;

            // Filter targets within range
            const targetsInRange = targets.filter(t => {
              const dist = this.getDistance(attacker.position, t.position);
              return dist <= abilityRange;
            });

            if (targetsInRange.length > 0) {
              // Find closest target within range
              const primaryTarget = targetsInRange.reduce((closest, current) => {
                const closestDist = this.getDistance(attacker.position, closest.position);
                const currentDist = this.getDistance(attacker.position, current.position);
                return currentDist < closestDist ? current : closest;
              });

              // Apply 2x2 area effect centered on primary target
              const fireballTiles = [
                primaryTarget.position,
                { row: primaryTarget.position.row + 1, col: primaryTarget.position.col },
                { row: primaryTarget.position.row, col: primaryTarget.position.col + 1 },
                { row: primaryTarget.position.row + 1, col: primaryTarget.position.col + 1 },
              ];

              affectedTargets = targets.filter(t =>
                fireballTiles.some(tile => tile.row === t.position.row && tile.col === t.position.col)
              );
            }
          } else {
            // Standard AOE status effect
            const abilityRange = ability.range || 1;

            // Filter targets within range
            const targetsInRange = targets.filter(t => {
              const dist = this.getDistance(attacker.position, t.position);
              return dist <= abilityRange;
            });

            if (targetsInRange.length > 0) {
              // Find closest target within range
              const primaryTarget = targetsInRange.reduce((closest, current) => {
                const closestDist = this.getDistance(attacker.position, closest.position);
                const currentDist = this.getDistance(attacker.position, current.position);
                return currentDist < closestDist ? current : closest;
              });

              // Apply status to all enemies within radius of primary target
              affectedTargets = targets.filter(t => {
                const dist = this.getDistance(primaryTarget.position, t.position);
                return dist <= (effect.radius || 0);
              });
            }
          }
        } else {
          // Single target status effect
          affectedTargets = [targets.reduce((closest, current) => {
            const closestDist = this.getDistance(attacker.position, closest.position);
            const currentDist = this.getDistance(attacker.position, current.position);
            return currentDist < closestDist ? current : closest;
          })];
        }

        // If no targets were affected, ability cannot be used
        if (affectedTargets.length === 0) {
          return false;
        }

        // Mark ability as actually used (targets found)
        abilityActuallyUsed = true;

        // Apply status effect to all affected targets
        for (const target of affectedTargets) {
          this.applyStatusEffect(target, effect.statusType, effect.duration, {
            damagePerTick: effect.damagePerTick,
          });
        }
      } else if (effect.type === 'heal') {
        // Heal allies
        const allies = attacker.isHero
          ? this.state.heroes.filter(h => h.isAlive)
          : this.state.enemies.filter(e => e.isAlive);

        abilityActuallyUsed = true; // Heals always succeed if we have allies

        const healAmount = effect.value || 0;
        for (const ally of allies) {
          const actualHeal = Math.min(healAmount, ally.baseStats.maxHp - ally.stats.hp);
          if (actualHeal > 0) {
            ally.stats.hp = Math.min(ally.baseStats.maxHp, ally.stats.hp + healAmount);
            this.addEvent(BattleEventType.Heal, {
              unit: ally.name,
              unitId: ally.id,
              amount: Math.floor(actualHeal),
              source: 'ability',
              abilityName: ability.name,
            });
          }
        }
      } else if (effect.type === 'buff') {
        // Apply buff to allies
        const allies = attacker.isHero
          ? this.state.heroes.filter(h => h.isAlive)
          : this.state.enemies.filter(e => e.isAlive);

        abilityActuallyUsed = true; // Buffs always succeed if we have allies

        for (const ally of allies) {
          if (effect.statModifier) {
            this.applyStatusEffect(ally, StatusEffectType.Shield, effect.duration || 3, {
              stat: effect.statModifier.stat as keyof UnitStats,
              value: effect.statModifier.value,
              isPercent: effect.statModifier.isPercent,
            });
          }
        }
      }
    }

    // Only use ability if it actually affected something
    if (!abilityActuallyUsed) {
      return false;
    }

    // Set ability cooldown
    attacker.abilityCooldowns.set(ability.id, ability.cooldown);

    return true;
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

    // Get all alive units (only include enemies from spawned waves)
    const allUnits = [
      ...this.state.heroes.filter(u => u.isAlive),
      ...this.state.enemies.filter(u => u.isAlive && (!u.wave || u.wave <= this.state.currentWave))
    ];

    // Safety check: Ensure all unit positions are within bounds
    // This catches any edge cases where positions might have gone out of bounds
    for (const unit of allUnits) {
      unit.position = this.clampPosition(unit.position);
    }

    // Advance cooldowns for all units
    const cooldownUpdates: any[] = [];
    for (const unit of allUnits) {
      unit.cooldown = Math.min(100, unit.cooldown + unit.cooldownRate);

      // Ability cooldowns are now action-based, not tick-based
      // They will be decremented when the unit takes an action (move/attack/ability)

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

      // Get effective range (considers ready abilities)
      const effectiveRange = this.getEffectiveRange(attacker);

      // Check if this unit is a support healer (War Cleric) - they should avoid moving toward enemies
      const isSupportHealer = attacker.abilities.some(a =>
        a.type === AbilityType.Support && a.effects.some(e => e.type === 'heal')
      );

      // Support healers always try to heal first, regardless of range
      if (isSupportHealer) {
        const usedAbility = this.tryUseAbility(attacker, targets);
        if (usedAbility) {
          // Reset cooldown after using ability
          attacker.cooldown = 0;
          // Decrement ability cooldowns (using ability counts as an action)
          this.decrementAbilityCooldowns(attacker);

          // Check if battle ended from ability usage
          if (this.checkBattleEnd()) {
            return;
          }
          continue;
        }

        // If no heal was used and enemies are out of range, skip turn (stay at back)
        if (distance > effectiveRange) {
          attacker.cooldown = 0;
          this.decrementAbilityCooldowns(attacker);
          continue;
        }
      }

      // Move towards target if out of range (unless this is a support healer)
      if (distance > effectiveRange && !isSupportHealer) {
        this.moveTowards(attacker, target);
        // Reset cooldown after moving
        attacker.cooldown = 0;
        // Decrement ability cooldowns (moving counts as an action)
        this.decrementAbilityCooldowns(attacker);
        continue;
      }

      // In range - try to use an ability first, then fall back to regular attack
      const usedAbility = this.tryUseAbility(attacker, targets);
      if (usedAbility) {
        // Reset cooldown after using ability
        attacker.cooldown = 0;
        // Decrement ability cooldowns (using ability counts as an action)
        this.decrementAbilityCooldowns(attacker);

        // Check if battle ended from ability usage
        if (this.checkBattleEnd()) {
          return;
        }
        continue;
      }

      // No ability used - perform regular attack
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
        // Decrement ability cooldowns (missing still counts as an action)
        this.decrementAbilityCooldowns(attacker);
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
      // Decrement ability cooldowns (attacking counts as an action)
      this.decrementAbilityCooldowns(attacker);

      // Check if target died
      if (target.stats.hp <= 0) {
        target.isAlive = false;
        // Vacate grid position in GridManager
        this.gridManager.vacate(target.position);
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

    // DEBUG: Verify no stacking at end of tick using GridManager
    const violations = this.gridManager.verifyNoStacking();
    if (violations.length > 0) {
      console.error(`[BattleSimulator] Stacking violations detected at tick ${this.state.tick}:`, violations);
    }
  }

  /**
   * Check if battle has ended or if we should spawn a new wave
   * Returns true if battle is completely over
   */
  private checkBattleEnd(): boolean {
    const heroesAlive = this.state.heroes.some((h) => h.isAlive);
    // Only check enemies from spawned waves
    const enemiesAlive = this.state.enemies.some((e) =>
      e.isAlive && (!e.wave || e.wave <= this.state.currentWave)
    );

    if (!heroesAlive) {
      this.state.winner = 'enemies';
      this.addEvent(BattleEventType.Defeat, {});
      return true;
    }

    if (!enemiesAlive) {
      // Check if there are more waves to spawn
      if (this.state.enemyWaves.length > 0) {
        // Wave completed - add pause event for player decision
        this.addEvent(BattleEventType.WaveComplete, {
          waveNumber: this.state.currentWave,
          totalWaves: this.state.totalWaves,
          nextWaveNumber: this.state.currentWave + 1,
        });

        // Then spawn the next wave
        this.spawnNextWave();
        return false; // Battle continues with new wave
      }

      // No more waves - heroes win!
      this.state.winner = 'heroes';
      this.addEvent(BattleEventType.Victory, {});
      return true;
    }

    return false;
  }

  /**
   * Spawn the next wave of enemies
   */
  private spawnNextWave(): void {
    const nextWave = this.state.enemyWaves.shift();
    if (!nextWave) return;

    this.state.currentWave++;

    console.log(`[spawnNextWave] Spawning wave ${this.state.currentWave} with ${nextWave.length} enemies`);

    // Reset hero positions to starting positions before new wave
    const getHeroPosition = (index: number): GridPosition => {
      const row = 2 + Math.floor(index / 2);
      const col = index % 2;

      if (row > 7) {
        const overflowIndex = index - 12;
        return {
          row: Math.floor(overflowIndex / 2),
          col: overflowIndex % 2
        };
      }

      return { row, col };
    };

    // Move all heroes back to their starting positions
    const heroRepositioningEvents: any[] = [];
    this.state.heroes.forEach((hero, index) => {
      if (!hero.isAlive) return; // Don't reposition dead heroes

      const startPosition = getHeroPosition(index);
      const oldPosition = { ...hero.position };

      // Only create movement event if position actually changed
      if (oldPosition.row !== startPosition.row || oldPosition.col !== startPosition.col) {
        // Update GridManager with atomic move
        const moveSuccess = this.gridManager.move(hero.id, oldPosition, startPosition);
        if (moveSuccess) {
          hero.position = startPosition;
          heroRepositioningEvents.push({
            unitId: hero.id,
            name: hero.name,
            from: oldPosition,
            to: startPosition,
          });
        } else {
          console.error(`[spawnNextWave] Failed to reposition hero ${hero.name} from`, oldPosition, 'to', startPosition);
        }
      }
    });

    // Add repositioning events if any heroes moved
    if (heroRepositioningEvents.length > 0) {
      heroRepositioningEvents.forEach(event => {
        this.addEvent(BattleEventType.Move, {
          unit: event.name,
          unitId: event.unitId,
          from: event.from,
          to: event.to,
        });
      });
    }

    // Helper function to get enemy position (same as constructor)
    const getEnemyPosition = (index: number): GridPosition => {
      const row = 2 + Math.floor(index / 2);
      const col = 7 - (index % 2);

      if (row > 7) {
        const overflowIndex = index - 12;
        return {
          row: Math.floor(overflowIndex / 2),
          col: 7 - (overflowIndex % 2)
        };
      }

      return { row, col };
    };

    // Convert enemies to battle units (starting off-screen to the right at col 8)
    const newEnemyUnits: BattleUnit[] = nextWave.map((e, index) => {
      const finalPosition = getEnemyPosition(index);
      const startPosition = { ...finalPosition, col: 8 }; // Start off-screen to the right

      const abilityCooldowns = new Map<string, number>();
      const enemyAbilities = e.abilities || [];
      enemyAbilities.forEach(ability => {
        abilityCooldowns.set(ability.id, 0);
      });

      const maxAbilityRange = enemyAbilities.length > 0
        ? Math.max(...enemyAbilities.map(a => a.range || 1))
        : 1;

      return {
        id: e.instanceId,
        name: e.name,
        spritePath: e.spritePath,
        baseStats: { ...e.currentStats },
        stats: { ...e.currentStats },
        statusEffects: [],
        isHero: false,
        isAlive: true,
        position: startPosition, // Start off-screen
        range: maxAbilityRange,
        cooldown: 0,
        cooldownRate: e.currentStats.speed / 10,
        abilities: enemyAbilities.map(a => ({ ...a })),
        abilityCooldowns,
        wave: this.state.currentWave, // Track which wave this enemy belongs to
      };
    });

    // Add new enemies to battle state
    this.state.enemies.push(...newEnemyUnits);

    console.log(`[spawnNextWave] Added ${newEnemyUnits.length} enemies to state. Total enemies in state: ${this.state.enemies.length}`);
    console.log(`[spawnNextWave] New enemies:`, newEnemyUnits.map(e => ({ name: e.name, wave: e.wave, pos: e.position, hp: e.stats.hp })));

    // Register new enemies with GridManager at their FINAL positions (not off-screen)
    // This is important because GridManager needs to know about them for collision detection
    // Even though they visually start off-screen, their logical grid position is on-screen
    newEnemyUnits.forEach((enemy, index) => {
      const finalPosition = getEnemyPosition(index);

      // Occupy the final position in GridManager
      const occupied = this.gridManager.occupy(finalPosition, enemy.id);
      if (!occupied) {
        console.error(`[spawnNextWave] Failed to occupy position for enemy ${enemy.name} at`, finalPosition);
        // Find nearest empty tile as fallback
        const nearestEmpty = this.gridManager.findNearestEmptyTile(finalPosition);
        if (nearestEmpty) {
          console.log(`[spawnNextWave] Moving ${enemy.name} to nearest empty tile:`, nearestEmpty);
          // Update the enemy's final position to use the nearest empty tile
          this.gridManager.occupy(nearestEmpty, enemy.id);
        }
      }

      // Update enemy position to final position immediately (for simulation logic)
      // The rendering layer will handle the slide-in animation separately
      enemy.position = finalPosition;
    });

    // Add wave start event with slide-in animations
    // Note: positions are now updated, but UI will animate from col: 8 to final position
    this.addEvent(BattleEventType.WaveStart, {
      waveNumber: this.state.currentWave,
      totalWaves: this.state.totalWaves,
      enemies: newEnemyUnits.map((e, index) => ({
        unitId: e.id,
        name: e.name,
        fromPosition: { ...e.position, col: 8 }, // Animation starts from off-screen
        toPosition: getEnemyPosition(index), // Animation ends at final position
      })),
    });
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
