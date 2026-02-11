import { Hero, Enemy, UnitStats, StatusEffect, StatusEffectType, Ability, AbilityType } from '@/types/core.types';
import { GridPosition } from '@/types/grid.types';
import { GridManager } from './GridManager';
import { PositionManager } from './PositionManager';
import { AnimationCoordinator } from './AnimationCoordinator';
import { COOLDOWN_DIVISOR } from '@/utils/constants';

// Re-export battle types from canonical location
export { BattleEventType, BattleEvent, BattleUnit, BattleState } from '@/types/battle.types';
import { BattleEventType, BattleEvent, BattleUnit, BattleState } from '@/types/battle.types';

/**
 * @deprecated This class is no longer used at runtime.
 * DeterministicBattleSimulatorV2 is the active simulator.
 * Kept as architectural reference only — safe to delete.
 */
export class BattleSimulator {
  private state: BattleState;
  private gridManager: GridManager;
  private positionManager: PositionManager;
  private animationCoordinator: AnimationCoordinator;

  constructor(heroes: Hero[], enemies: Enemy[] | Enemy[][]) {
    // Initialize grid manager (8x8 grid) - keeping for backwards compatibility
    this.gridManager = new GridManager(8, 8);

    // Initialize new position management system
    this.positionManager = new PositionManager(8, 8);
    this.animationCoordinator = new AnimationCoordinator(this.positionManager);

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

      // Start with full health at beginning of battle
      const fullHealthStats = {
        ...h.currentStats,
        hp: h.currentStats.maxHp  // Always start at full health
      };

      return {
        id: h.instanceId,
        name: h.name,
        class: h.class,
        spritePath: h.spritePath,
        baseStats: { ...fullHealthStats },
        stats: { ...fullHealthStats },
        statusEffects: [],
        isHero: true,
        isAlive: true,
        position,
        range: maxAbilityRange, // Set range based on abilities
        cooldown: 0, // Start at 0, will fill to 100
        cooldownRate: h.currentStats.speed / COOLDOWN_DIVISOR,
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
        cooldownRate: e.currentStats.speed / COOLDOWN_DIVISOR,
        abilities: enemyAbilities.map(a => ({ ...a })), // Copy abilities
        abilityCooldowns,
        wave: 1, // First wave enemies
      };
    });

    // Register all units with both GridManager (legacy) and PositionManager (new)
    const allUnits = [...heroUnits, ...enemyUnits];
    allUnits.forEach(unit => {
      // Try to initialize in PositionManager first
      if (!this.positionManager.initializeUnit(unit.id, unit.position)) {
        // If position is occupied, find nearest empty
        const nearestEmpty = this.findNearestEmptyPosition(unit.position);
        if (nearestEmpty) {
            unit.position = nearestEmpty;
          this.positionManager.initializeUnit(unit.id, nearestEmpty);
        } else {
          }
      }

      // Also update legacy GridManager for compatibility
      this.gridManager.occupy(unit.position, unit.id);
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
   * Find nearest empty position using PositionManager
   */
  private findNearestEmptyPosition(position: GridPosition, maxRadius: number = 5): GridPosition | null {
    // Check center first
    if (!this.positionManager.isOccupied(position)) {
      return position;
    }

    // Spiral search outward
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dRow = -radius; dRow <= radius; dRow++) {
        for (let dCol = -radius; dCol <= radius; dCol++) {
          if (Math.abs(dRow) !== radius && Math.abs(dCol) !== radius) {
            continue;
          }

          const checkPos: GridPosition = {
            row: position.row + dRow,
            col: position.col + dCol,
          };

          if (checkPos.row >= 0 && checkPos.row < 8 &&
              checkPos.col >= 0 && checkPos.col < 8 &&
              !this.positionManager.isOccupied(checkPos)) {
            return checkPos;
          }
        }
      }
    }

    return null;
  }

  /**
   * Move unit closer to target, avoiding occupied spaces
   * Now uses PositionManager for atomic, transactional movements
   * @param reservedPositions - Set of positions already reserved this tick
   */
  private moveTowards(unit: BattleUnit, target: BattleUnit, reservedPositions?: Set<string>): void {
    const oldPosition = { ...unit.position };
    const currentDist = this.getDistance(unit.position, target.position);

    // Get all valid adjacent positions (8-directional)
    const allPossibleMoves = this.gridManager.getAdjacentPositionsWithDiagonals(unit.position);

    // Score each potential move first (before checking if walkable)
    const potentialMoves = allPossibleMoves.map(move => {
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
    potentialMoves.sort((a, b) => a.score - b.score);

    // Try moves in order of preference using the new transactional system
    for (const potentialMove of potentialMoves) {
      const { move, distToTarget } = potentialMove;

      // Check if this specific move would get us stuck
      const distIncrease = distToTarget - currentDist;
      if (distIncrease > 1) {
        continue;
      }

      // Check if position is reserved this tick
      const moveKey = `${move.row},${move.col}`;
      if (reservedPositions && reservedPositions.has(moveKey)) {
        continue; // Try next move option
      }

      // CRITICAL: Check BOTH managers before moving to prevent desync
      const pmOccupant = this.positionManager.getOccupant(move);
      const gmOccupant = this.gridManager.getOccupant(move);

      if (pmOccupant && pmOccupant !== unit.id) {
        continue;
      }

      if (gmOccupant && gmOccupant !== unit.id) {
        continue;
      }

      // Try to move using PositionManager's atomic move method
      if (this.positionManager.moveUnit(unit.id, move)) {
        // Reserve this position for the rest of this tick
        if (reservedPositions) {
          reservedPositions.add(moveKey);
        }

        // Update GridManager atomically
        if (!this.gridManager.move(unit.id, oldPosition, move)) {
          // GridManager failed - rollback PositionManager
          this.positionManager.moveUnit(unit.id, oldPosition);
          continue;
        }

        // Update unit's position
        unit.position = move;

        // Add movement event (animation will be handled by event processor)
        this.addEvent(BattleEventType.Move, {
          unit: unit.name,
          unitId: unit.id,
          from: oldPosition,
          to: move,
        });

        return;
      } else {
        // Move rejected - check why
        const occupant = this.positionManager.getOccupant(move);
        if (occupant && occupant !== unit.id) {
          // Find who is occupying
          const occupyingUnit = [...this.state.heroes, ...this.state.enemies].find(u => u.id === occupant);
          if (occupyingUnit) {
          }
        }
      }
      // If move was rejected, try next option
    }

    // No valid moves found
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
            // Remove from both position managers
            this.positionManager.removeUnit(unit.id);
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
    unit.cooldownRate = unit.stats.speed / COOLDOWN_DIVISOR;
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
            // Remove from both position managers
            this.positionManager.removeUnit(target.id);
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
   * Verify that PositionManager and GridManager are in sync
   */
  private verifyPositionSync(): void {
    const issues: string[] = [];

    // Check all units
    const allUnits = [...this.state.heroes, ...this.state.enemies].filter(u => u.isAlive);

    for (const unit of allUnits) {
      const pmPos = this.positionManager.getLogicalPosition(unit.id);
      const gmOccupant = this.gridManager.getOccupant(unit.position);

      // Check if unit exists in PositionManager
      if (!pmPos) {
        issues.push(`Unit ${unit.name} (${unit.id}) not in PositionManager but is at (${unit.position.row},${unit.position.col})`);
      } else if (pmPos.row !== unit.position.row || pmPos.col !== unit.position.col) {
        issues.push(`Unit ${unit.name} position mismatch: BattleUnit=(${unit.position.row},${unit.position.col}) PM=(${pmPos.row},${pmPos.col})`);
      }

      // Check if GridManager has correct occupant
      if (gmOccupant !== unit.id) {
        issues.push(`GridManager mismatch at (${unit.position.row},${unit.position.col}): expected ${unit.id}, found ${gmOccupant}`);
      }
    }

    if (issues.length > 0) {
    }
  }

  /**
   * Process one tick of combat
   * Advances all unit cooldowns and triggers actions for units at 100%
   */
  private processTick(): void {
    this.state.tick++;

    // Verify position sync every 5 ticks
    if (this.state.tick % 5 === 0) {
      this.verifyPositionSync();
    }

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

    // Verify grid consistency before processing actions (debug)
    if (this.state.tick % 10 === 0) { // Check every 10 ticks
      const allUnitsForCheck = [...this.state.heroes, ...this.state.enemies];
      const issues = this.gridManager.verifyConsistency(allUnitsForCheck);
      if (issues.length > 0) {
      }
    }

    // Track positions reserved this tick to prevent multiple units moving to same space
    const reservedPositions = new Set<string>();

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
        this.moveTowards(attacker, target, reservedPositions);
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
        // Remove from both position managers
        this.positionManager.removeUnit(target.id);
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
        // Determine if we should pause for player decision
        // Pause every 3 waves, or before the final boss wave
        const shouldPause =
          this.state.currentWave % 3 === 0 || // Every 3 waves
          this.state.currentWave + 1 === this.state.totalWaves; // Before boss wave

        if (shouldPause) {
          // Wave completed - add pause event for player decision
          this.addEvent(BattleEventType.WaveComplete, {
            waveNumber: this.state.currentWave,
            totalWaves: this.state.totalWaves,
            nextWaveNumber: this.state.currentWave + 1,
          });
        }

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

    // Wave transition with scroll
    const scrollDistance = 2; // Number of grid cells the background scrolls left
    const aliveHeroes = this.state.heroes.filter(h => h.isAlive);
    const aliveEnemies = this.state.enemies.filter(e => e.isAlive);

    // Update positions IMMEDIATELY to keep logic and visuals in sync
    // This prevents the mismatch between visual and logical positions

    // First, update all unit positions logically
    aliveHeroes.forEach(hero => {
      const oldPos = { ...hero.position };
      // Heroes shift scrollDistance + 1 tiles (extra tile to make room)
      const newCol = Math.max(0, hero.position.col - scrollDistance - 1);
      const newPos = { row: hero.position.row, col: newCol };

      // Update position immediately
      hero.position = newPos;
    });

    aliveEnemies.forEach(enemy => {
      const oldPos = { ...enemy.position };
      const newCol = enemy.position.col - scrollDistance;

      if (newCol >= 0) {
        enemy.position = { row: enemy.position.row, col: newCol };
      }
    });

    // NOW trigger the transition event with updated positions
    this.addEvent(BattleEventType.WaveTransition, {
      waveNumber: this.state.currentWave,
      scrollDistance, // Number of grid cells to scroll
      duration: 1000, // Animation duration in ms
    });

    // Update position managers after a short delay to let animations start
    setTimeout(() => {
      // Sync position managers with already-updated positions
      aliveHeroes.forEach(hero => {
        // Position was already updated above, just sync the managers
        const newPos = hero.position;

        // Check if hero is in PositionManager
        const currentPos = this.positionManager.getLogicalPosition(hero.id);
        if (!currentPos) {
          this.positionManager.initializeUnit(hero.id, newPos);
          this.gridManager.occupy(newPos, hero.id);
        } else {
          // Update PositionManager to match new position
          const oldPos = currentPos;
          if (this.positionManager.moveUnit(hero.id, newPos)) {
            this.gridManager.vacate(oldPos);
            this.gridManager.occupy(newPos, hero.id);
          }
        }
      });

      aliveEnemies.forEach(enemy => {
        const newPos = enemy.position; // Already updated above

        if (newPos.col < 0) {
          // Enemy was pushed off screen
          enemy.isAlive = false;
          this.positionManager.removeUnit(enemy.id);
          this.gridManager.vacate({ row: newPos.row, col: Math.max(0, newPos.col + scrollDistance) });
          // Also remove from state enemies array
          const enemyIndex = this.state.enemies.findIndex(e => e.id === enemy.id);
          if (enemyIndex > -1) {
            this.state.enemies.splice(enemyIndex, 1);
          }
        } else {
          // Sync position managers with already-updated position
          const currentPos = this.positionManager.getLogicalPosition(enemy.id);
          if (!currentPos) {
            this.positionManager.initializeUnit(enemy.id, newPos);
            this.gridManager.occupy(newPos, enemy.id);
          } else {
            // Update PositionManager to match new position
            const oldPos = currentPos;
            if (this.positionManager.moveUnit(enemy.id, newPos)) {
              this.gridManager.vacate(oldPos);
              this.gridManager.occupy(newPos, enemy.id);
            }
          }
        }
      });

    }, 1100); // Slightly after animation completes

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

    // Convert enemies to battle units
    const newEnemyUnits: BattleUnit[] = nextWave.map((e, index) => {
      const finalPosition = getEnemyPosition(index);

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
        position: finalPosition, // Use final position for game logic
        range: maxAbilityRange,
        cooldown: 0,
        cooldownRate: e.currentStats.speed / COOLDOWN_DIVISOR,
        abilities: enemyAbilities.map(a => ({ ...a })),
        abilityCooldowns,
        wave: this.state.currentWave, // Track which wave this enemy belongs to
      };
    });

    // Add new enemies to battle state
    this.state.enemies.push(...newEnemyUnits);

    // Clear any stale positions for enemies before spawning new ones
    // This ensures no collision with dead enemies that weren't properly cleaned up
    for (let row = 0; row < 8; row++) {
      for (let col = 6; col <= 7; col++) {
        const pos = { row, col };
        const occupant = this.positionManager.getOccupant(pos);
        if (occupant) {
          // Check if this unit is actually alive
          const unit = [...this.state.heroes, ...this.state.enemies].find(u => u.id === occupant);
          if (!unit || !unit.isAlive) {
            this.positionManager.removeUnit(occupant);
            this.gridManager.vacate(pos);
          }
        }
      }
    }

    // Register new enemies with both PositionManager and GridManager
    newEnemyUnits.forEach((enemy, index) => {
      const finalPosition = getEnemyPosition(index);

      // Validate position is well-formed
      if (!finalPosition || typeof finalPosition.row !== 'number' || typeof finalPosition.col !== 'number') {
        // Use a fallback position
        const fallbackPosition = { row: 2 + (index % 6), col: 7 };
        enemy.position = fallbackPosition;
        this.positionManager.initializeUnit(enemy.id, fallbackPosition);
        this.gridManager.occupy(fallbackPosition, enemy.id);
        return;
      }

      // Try to initialize in PositionManager first
      if (this.positionManager.initializeUnit(enemy.id, finalPosition)) {
        // Successfully initialized in PositionManager
        enemy.position = finalPosition;
        this.gridManager.occupy(finalPosition, enemy.id);
      } else {
        // Position is occupied, find who's there
        const occupant = this.positionManager.getOccupant(finalPosition);
        const nearestEmpty = this.findNearestEmptyPosition(finalPosition);
        if (nearestEmpty) {
          if (this.positionManager.initializeUnit(enemy.id, nearestEmpty)) {
            enemy.position = nearestEmpty;
            this.gridManager.occupy(nearestEmpty, enemy.id);
          } else {
            // Remove this enemy from the wave - it can't be placed
            const enemyIndex = newEnemyUnits.indexOf(enemy);
            if (enemyIndex > -1) {
              newEnemyUnits.splice(enemyIndex, 1);
            }
          }
        } else {
          // Remove this enemy from the wave - it can't be placed
          const enemyIndex = newEnemyUnits.indexOf(enemy);
          if (enemyIndex > -1) {
            newEnemyUnits.splice(enemyIndex, 1);
          }
        }
      }
    });

    // Add wave start event with slide-in animations
    // Note: positions are now updated, but UI will animate from col: 8 to final position
    this.addEvent(BattleEventType.WaveStart, {
      waveNumber: this.state.currentWave,
      totalWaves: this.state.totalWaves,
      enemies: newEnemyUnits.map((e) => ({
        unitId: e.id,
        name: e.name,
        fromPosition: { ...e.position, col: 8 }, // Animation starts from off-screen
        toPosition: e.position, // Animation ends at actual occupied position
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
