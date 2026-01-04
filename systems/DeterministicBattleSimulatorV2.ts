/**
 * DeterministicBattleSimulator V2
 *
 * A drop-in replacement for BattleSimulator that pre-computes all battle events
 * while maintaining 100% compatibility with the existing battle system.
 *
 * Key principle: Generate the EXACT same BattleEvent structure as the original system
 * so all existing hooks, animations, and systems work unchanged.
 */

import { Hero, Enemy, Ability, AbilityType } from '@/types/core.types';
import {
  BattleState,
  BattleEvent,
  BattleEventType,
  BattleUnit
} from './BattleSimulator';

interface Position {
  row: number;
  col: number;
}

interface SimulatedUnit {
  id: string;
  instanceId: string;
  name: string;
  class?: string;
  spritePath?: string;
  position: Position;
  stats: {
    hp: number;
    maxHp: number;
    damage: number;
    speed: number;
    defense: number;
    critChance: number;
    critDamage: number;
    evasion: number;
    accuracy: number;
  };
  cooldown: number;
  cooldownRate: number;
  abilities: Ability[];
  abilityCooldowns: Map<string, number>; // Track cooldowns for each ability
  isAlive: boolean;
  wave?: number;
  isHero: boolean;
}

export class DeterministicBattleSimulatorV2 {
  private units: Map<string, SimulatedUnit> = new Map();
  private events: BattleEvent[] = [];
  private currentTick: number = 0;
  private occupancy: Map<string, string> = new Map(); // "row,col" -> unitId
  private readonly gridWidth: number = 8;
  private readonly gridHeight: number = 8;

  constructor(heroes: Hero[], enemies: Enemy[] | Enemy[][]) {
    this.initializeUnits(heroes, enemies);
  }

  /**
   * Simulate a single wave starting from the given wave number
   */
  public simulateWave(targetWave: number, existingEvents: BattleEvent[] = []): BattleState {
    console.log(`[DeterministicBattleSimulatorV2] Simulating single wave ${targetWave}`);

    // Start with existing events (from previous waves)
    this.events = [...existingEvents];
    this.currentTick = existingEvents.length > 0 ? Math.max(...existingEvents.map(e => e.tick)) : 0;

    const allEnemyWaves = this.getEnemyWaves();
    const totalWaves = allEnemyWaves.length;

    if (targetWave > totalWaves) {
      console.error(`[DeterministicBattleSimulatorV2] Invalid wave ${targetWave}, max is ${totalWaves}`);
      return this.buildBattleState(targetWave, totalWaves);
    }

    // Spawn and simulate only the target wave
    this.spawnWave(targetWave, totalWaves);
    const waveResult = this.simulateWaveCombat();

    if (waveResult === 'defeat') {
      this.events.push({
        type: BattleEventType.Defeat,
        tick: this.currentTick,
        data: {}
      });
    } else {
      // Wave complete
      const remainingEnemies = this.getAliveEnemies();
      this.events.push({
        type: BattleEventType.WaveComplete,
        tick: this.currentTick,
        data: {
          waveNumber: targetWave,
          enemiesDefeated: remainingEnemies.length,
          nextWaveNumber: targetWave + 1,
          totalWaves: totalWaves
        }
      });

      // Add wave transition if not the last wave
      if (targetWave < totalWaves) {
        this.addWaveTransition(targetWave + 1);
      } else {
        // Final victory
        this.events.push({
          type: BattleEventType.Victory,
          tick: this.currentTick,
          data: {}
        });
      }
    }

    return this.buildBattleState(targetWave, totalWaves);
  }

  /**
   * Build the final battle state object
   */
  private buildBattleState(currentWave: number, totalWaves: number): BattleState {
    // Build final battle state
    const heroes = this.getHeroes()
      .map(unit => this.unitToBattleUnit(unit))
      .filter(unit => unit !== null) as BattleUnit[];

    const enemies = this.getEnemies()
      .map(unit => this.unitToBattleUnit(unit))
      .filter(unit => unit !== null) as BattleUnit[];

    // Determine winner
    const aliveHeroes = this.getAliveHeroes();
    const aliveEnemies = this.getAliveEnemies();

    let winner: 'heroes' | 'enemies' | null = null;
    if (aliveHeroes.length > 0 && aliveEnemies.length === 0) {
      winner = 'heroes';
    } else if (aliveHeroes.length === 0) {
      winner = 'enemies';
    }

    return {
      tick: this.currentTick,
      heroes,
      enemies,
      events: this.events,
      winner,
      currentWave: currentWave,
      totalWaves: totalWaves,
      enemyWaves: [] // Already processed
    };
  }

  /**
   * Simulate the entire battle and return a BattleState with all events
   * This is the main entry point that matches the original BattleSimulator interface
   */
  public simulate(): BattleState {
    console.error('[DeterministicBattleSimulatorV2] Starting simulation - wave 1 only');
    console.warn('[DeterministicBattleSimulatorV2] Starting simulation - wave 1 only');

    // Clear previous state
    this.events = [];
    this.currentTick = 0;

    // Add battle start event
    this.events.push({
      type: BattleEventType.BattleStart,
      tick: this.currentTick,
      data: {}
    });

    // Simulate only wave 1 - subsequent waves will be simulated on-demand
    return this.simulateWave(1, this.events);
  }

  /**
   * Initialize units from heroes and enemies
   */
  private initializeUnits(heroes: Hero[], enemies: Enemy[] | Enemy[][]) {
    // Initialize heroes
    heroes.forEach((hero, index) => {
      // Check if hero already has a position (from formation), otherwise use default
      const position = (hero as any).position || this.getHeroStartPosition(index);

      console.log(`[V2 InitializeUnit] Hero ${hero.name}: Using position (${position.row}, ${position.col})`);

      // Validate position
      if (position.row < 0 || position.row >= 8 || position.col < 0 || position.col >= 8) {
        console.error(`[initializeUnits] Invalid hero position for ${hero.name} at index ${index}: (${position.row}, ${position.col})`);
      }

      const abilityCooldowns = new Map<string, number>();
      // Initialize all ability cooldowns to 0 (ready to use)
      hero.abilities.forEach(ability => {
        abilityCooldowns.set(ability.id, 0);
      });

      const unit: SimulatedUnit = {
        id: hero.instanceId,
        instanceId: hero.instanceId,
        name: hero.name,
        class: hero.class,
        spritePath: hero.spritePath,
        position,
        stats: { ...hero.currentStats },
        cooldown: 0,
        cooldownRate: hero.currentStats.speed / 10,
        abilities: [...hero.abilities],
        abilityCooldowns,
        isAlive: true,
        isHero: true
      };

      console.error(`[Initialize Hero] ${hero.name}: HP=${hero.currentStats.hp}/${hero.currentStats.maxHp}, Defense=${hero.currentStats.defense}`);
      this.units.set(hero.instanceId, unit);
      this.setOccupancy(position, hero.instanceId);
    });

    // Initialize enemies (handle both flat and wave arrays)
    if (Array.isArray(enemies[0])) {
      // Multi-wave format
      (enemies as Enemy[][]).forEach((wave, waveIndex) => {
        wave.forEach((enemy, enemyIndex) => {
          // For wave 1, place on grid. For later waves, start off-grid
          const position = waveIndex === 0
            ? this.getEnemyStartPosition(enemyIndex)
            : {
                // Off-grid but unique positions to avoid collisions when corrected
                row: (2 + Math.floor(enemyIndex / 2)) % 8, // Ensure row stays 0-7
                col: 9 + waveIndex // Different column for each wave to ensure uniqueness
              };

          // Validate position for wave 1 enemies
          if (waveIndex === 0 && (position.row < 0 || position.row >= 8 || position.col < 0 || position.col >= 8)) {
            console.error(`[initializeUnits] Invalid enemy position for ${enemy.name} at index ${enemyIndex}: (${position.row}, ${position.col})`);
          }

          const abilityCooldowns = new Map<string, number>();
          // Initialize all ability cooldowns to 0 (ready to use)
          if (enemy.abilities) {
            enemy.abilities.forEach(ability => {
              abilityCooldowns.set(ability.id, 0);
            });
          }

          const unit: SimulatedUnit = {
            id: enemy.instanceId,
            instanceId: enemy.instanceId,
            name: enemy.name,
            spritePath: enemy.spritePath,
            position,
            stats: { ...enemy.currentStats },
            cooldown: 0,
            cooldownRate: enemy.currentStats.speed / 10,
            abilities: enemy.abilities || [],
            abilityCooldowns,
            isAlive: true,
            wave: waveIndex + 1,
            isHero: false
          };
          this.units.set(enemy.instanceId, unit);

          // Only set occupancy for first wave enemies
          if (waveIndex === 0) {
            this.setOccupancy(position, enemy.instanceId);
          }
        });
      });
    } else {
      // Single wave format
      (enemies as Enemy[]).forEach((enemy, index) => {
        const position = this.getEnemyStartPosition(index);

        // Validate position
        if (position.row < 0 || position.row >= 8 || position.col < 0 || position.col >= 8) {
          console.error(`[initializeUnits] Invalid enemy position for ${enemy.name} at index ${index}: (${position.row}, ${position.col})`);
        }

        const abilityCooldowns = new Map<string, number>();
        // Initialize all ability cooldowns to 0 (ready to use)
        if (enemy.abilities) {
          enemy.abilities.forEach(ability => {
            abilityCooldowns.set(ability.id, 0);
          });
        }

        const unit: SimulatedUnit = {
          id: enemy.instanceId,
          instanceId: enemy.instanceId,
          name: enemy.name,
          spritePath: enemy.spritePath,
          position,
          stats: { ...enemy.currentStats },
          cooldown: 0,
          cooldownRate: enemy.currentStats.speed / 10,
          abilities: enemy.abilities || [],
          abilityCooldowns,
          isAlive: true,
          wave: 1,
          isHero: false
        };
        this.units.set(enemy.instanceId, unit);
        this.setOccupancy(position, enemy.instanceId);
      });
    }
  }

  /**
   * Spawn enemies for a wave
   */
  private spawnWave(waveNumber: number, totalWaves: number) {
    const waveEnemies = Array.from(this.units.values()).filter(
      u => !u.isHero && u.wave === waveNumber
    );

    // Add wave start event
    this.events.push({
      type: BattleEventType.WaveStart,
      tick: this.currentTick,
      data: {
        waveNumber,
        totalWaves,
        enemies: waveEnemies.map((enemy, index) => {
          const targetPos = this.getEnemyStartPosition(index);

          // For wave 1, enemies are already positioned correctly
          // For later waves, move them from off-grid to on-grid
          if (waveNumber > 1) {
            // Clear old position if it was on-grid
            if (enemy.position.col < 8) {
              this.clearOccupancy(enemy.position);
            }

            // Check if target position is already occupied
            if (this.isOccupied(targetPos)) {
              // Find an alternative position
              console.warn(`[spawnWave] Position ${targetPos.row},${targetPos.col} is occupied, finding alternative for ${enemy.name}`);
              // Try adjacent columns first
              for (let colOffset = 1; colOffset <= 2; colOffset++) {
                const altCol = targetPos.col - colOffset;
                if (altCol >= 4 && !this.isOccupied({ row: targetPos.row, col: altCol })) {
                  enemy.position = { row: targetPos.row, col: altCol };
                  this.setOccupancy(enemy.position, enemy.id);
                  break;
                }
              }
              // If still no position found, try different rows
              if (this.isOccupied(enemy.position) || enemy.position.col >= 8) {
                for (let rowOffset = 1; rowOffset <= 3; rowOffset++) {
                  const altRow = (targetPos.row + rowOffset) % 8;
                  if (!this.isOccupied({ row: altRow, col: targetPos.col })) {
                    enemy.position = { row: altRow, col: targetPos.col };
                    this.setOccupancy(enemy.position, enemy.id);
                    break;
                  }
                }
              }
            } else {
              enemy.position = targetPos;
              this.setOccupancy(targetPos, enemy.id);
            }
          }

          return {
            unitId: enemy.id,
            fromPosition: waveNumber === 1
              ? targetPos  // Wave 1 enemies start in position
              : { row: targetPos.row, col: 8 }, // Later waves slide in
            toPosition: targetPos
          };
        })
      }
    });
  }

  /**
   * Simulate combat for a single wave
   */
  private simulateWaveCombat(): 'victory' | 'defeat' {
    const maxTicks = 10000; // Safety limit

    while (this.currentTick < maxTicks) {
      this.currentTick++;

      // Get alive units
      const aliveHeroes = this.getAliveHeroes();
      const aliveEnemies = this.getAliveEnemies();

      // Check win/loss conditions
      if (aliveHeroes.length === 0) {
        return 'defeat';
      }
      if (aliveEnemies.length === 0) {
        return 'victory';
      }

      // Update cooldowns for all alive units
      const cooldownUpdates: any[] = [];
      [...aliveHeroes, ...aliveEnemies].forEach(unit => {
        const oldCooldown = unit.cooldown;
        unit.cooldown = Math.min(100, unit.cooldown + unit.cooldownRate);
        cooldownUpdates.push({
          unitId: unit.id,
          cooldown: unit.cooldown,
          cooldownRate: unit.cooldownRate
        });
      });

      // Add tick event with cooldown updates
      this.events.push({
        type: BattleEventType.Tick,
        tick: this.currentTick,
        data: { cooldowns: cooldownUpdates }
      });

      // Process actions for units at 100% cooldown
      const readyUnits = [...aliveHeroes, ...aliveEnemies].filter(u => u.cooldown >= 100);
      readyUnits.sort((a, b) => b.cooldown - a.cooldown); // Higher cooldown acts first

      for (const unit of readyUnits) {
        this.processUnitAction(unit);
        unit.cooldown = 0; // Reset after action
      }
    }

    return 'defeat'; // Timeout
  }

  /**
   * Process a single unit's action (abilities, move, or attack)
   */
  private processUnitAction(unit: SimulatedUnit) {
    // Find targets
    const enemies = this.getAliveUnits().filter(u => u.isHero !== unit.isHero);
    const allies = this.getAliveUnits().filter(u => u.isHero === unit.isHero && u.id !== unit.id);

    if (enemies.length === 0) return;

    const nearestEnemy = this.findClosestTarget(unit, enemies);
    if (!nearestEnemy) return;

    const distance = this.getDistance(unit.position, nearestEnemy.position);

    // Check if we can use an ability
    const usableAbility = this.findUsableAbility(unit, nearestEnemy, enemies, allies);

    if (usableAbility) {
      console.log(`[Ability Use] ${unit.name} preparing to use ${usableAbility.ability.name} on ${usableAbility.targets.map(t => t.name).join(', ')}`);
      // Use ability
      this.useAbility(unit, usableAbility.ability, usableAbility.targets);
      // Set ability cooldown
      unit.abilityCooldowns.set(usableAbility.ability.id, usableAbility.ability.cooldown);
      console.log(`[Ability Cooldown] Set ${usableAbility.ability.name} cooldown to ${usableAbility.ability.cooldown}`);
    } else if (distance > 1) {
      // Move closer
      const newPos = this.findMovePosition(unit, nearestEnemy);
      if (newPos && this.posKey(newPos) !== this.posKey(unit.position)) {
        const fromPos = { ...unit.position };
        const toPos = { ...newPos };

        // Debug first few moves
        if (this.events.filter(e => e.type === BattleEventType.Move).length < 3) {
          console.log(`[V2 Move] ${unit.name} moving from (${fromPos.row},${fromPos.col}) to (${toPos.row},${toPos.col})`);
        }

        // Add move event
        this.events.push({
          type: BattleEventType.Move,
          tick: this.currentTick,
          data: {
            unit: unit.name,
            unitId: unit.id,
            from: fromPos,
            to: toPos
          }
        });

        // Update position
        this.clearOccupancy(unit.position);
        unit.position = newPos;
        this.setOccupancy(newPos, unit.id);
      }
    } else {
      // Basic attack
      const damage = Math.max(1, unit.stats.damage - Math.floor(nearestEnemy.stats.defense * 0.3));

      console.log(`[Basic Attack] ${unit.name} attacks ${nearestEnemy.name}: baseDamage=${unit.stats.damage}, defense=${nearestEnemy.stats.defense}, final=${damage}, targetHP=${nearestEnemy.stats.hp}`);

      // Add attack event
      this.events.push({
        type: BattleEventType.Attack,
        tick: this.currentTick,
        data: {
          attacker: unit.name,
          attackerId: unit.id,
          target: nearestEnemy.name,
          targetId: nearestEnemy.id,
          damage
        }
      });

      // Apply damage
      nearestEnemy.stats.hp -= damage;

      console.log(`[Basic Attack Result] ${nearestEnemy.name} HP after: ${nearestEnemy.stats.hp}`);

      // Add damage event
      this.events.push({
        type: BattleEventType.Damage,
        tick: this.currentTick,
        data: {
          target: nearestEnemy.name,
          targetId: nearestEnemy.id,
          damage,
          remainingHp: Math.max(0, nearestEnemy.stats.hp)
        }
      });

      // Check for death
      if (nearestEnemy.stats.hp <= 0) {
        nearestEnemy.isAlive = false;
        this.clearOccupancy(nearestEnemy.position);

        // Add death event
        this.events.push({
          type: BattleEventType.Death,
          tick: this.currentTick,
          data: {
            unit: nearestEnemy.name,
            unitId: nearestEnemy.id
          }
        });
      }
    }
  }

  /**
   * Find a usable ability for the unit
   */
  private findUsableAbility(unit: SimulatedUnit, mainTarget: SimulatedUnit, enemies: SimulatedUnit[], allies: SimulatedUnit[]):
    { ability: Ability, targets: SimulatedUnit[] } | null {

    // Check each ability
    for (const ability of unit.abilities) {
      // Skip if on cooldown
      const cooldown = unit.abilityCooldowns.get(ability.id) || 0;
      if (cooldown > 0) continue;

      // Check range
      const range = ability.range || 1;
      const distance = this.getDistance(unit.position, mainTarget.position);
      if (distance > range) continue;

      // For simplicity, only use offensive abilities on enemies
      const hasOffensiveEffect = ability.effects.some(e =>
        e.type === 'damage' || e.type === 'debuff' || e.type === 'status'
      );

      if (hasOffensiveEffect) {
        return { ability, targets: [mainTarget] };
      }
    }

    return null;
  }

  /**
   * Use an ability
   */
  private useAbility(caster: SimulatedUnit, ability: Ability, targets: SimulatedUnit[]) {
    // Add ability used event
    this.events.push({
      type: BattleEventType.AbilityUsed,
      tick: this.currentTick,
      data: {
        attacker: caster.name,
        attackerId: caster.id,
        abilityName: ability.name,
        abilityId: ability.id
      }
    });

    // Process ability effects
    let totalDamageDealt = 0; // Track total damage for lifesteal

    for (const effect of ability.effects) {
      // Determine actual targets based on effect targetType
      const actualTargets = effect.targetType === 'self' ? [caster] : targets;

      for (const target of actualTargets) {
        if (effect.type === 'damage' && effect.value) {
          // Apply defense reduction to ability damage similar to basic attacks
          const rawDamage = effect.value;
          const damage = Math.max(1, rawDamage - Math.floor(target.stats.defense * 0.3));

          // Check if this is the one-shot bug
          if (target.name.includes('Adventurer') && damage < 50 && target.stats.hp > 50) {
            console.error(`[BUG DETECTED] Wraith about to one-shot ${target.name}!`);
            console.error(`  Raw damage: ${rawDamage}`);
            console.error(`  Defense: ${target.stats.defense}`);
            console.error(`  Final damage: ${damage}`);
            console.error(`  Target HP before: ${target.stats.hp}`);
            console.error(`  This should NOT kill the target!`);
          }

          console.error(`[Ability Damage] ${caster.name} uses ${ability.name} on ${target.name}: raw=${rawDamage}, defense=${target.stats.defense}, final=${damage}, targetHP before=${target.stats.hp}`);

          target.stats.hp -= damage;
          totalDamageDealt += damage; // Track for lifesteal

          console.log(`[Ability Damage Result] ${target.name} HP after damage: ${target.stats.hp} (took ${damage} damage)`);

          // Add damage event
          this.events.push({
            type: BattleEventType.Damage,
            tick: this.currentTick,
            data: {
              target: target.name,
              targetId: target.id,
              damage,
              remainingHp: Math.max(0, target.stats.hp),
              source: 'ability',
              abilityName: ability.name
            }
          });

          // Check for death
          if (target.stats.hp <= 0) {
            console.log(`[Death] ${target.name} died! HP was ${target.stats.hp} after taking ${damage} damage`);
            target.isAlive = false;
            this.clearOccupancy(target.position);

            this.events.push({
              type: BattleEventType.Death,
              tick: this.currentTick,
              data: {
                unit: target.name,
                unitId: target.id,
                cause: ability.name
              }
            });
          }
        } else if (effect.type === 'heal' && effect.value) {
          const healing = Math.min(effect.value, target.stats.maxHp - target.stats.hp);
          if (healing > 0) {
            target.stats.hp += healing;

            this.events.push({
              type: BattleEventType.Heal,
              tick: this.currentTick,
              data: {
                unit: target.name,
                unitId: target.id,
                amount: healing,
                source: ability.name
              }
            });
          }
        } else if (effect.type === 'lifesteal' && effect.value && totalDamageDealt > 0) {
          // Lifesteal healing for the caster based on actual damage dealt
          const healAmount = Math.floor(totalDamageDealt * effect.value);
          const actualHeal = Math.min(healAmount, caster.stats.maxHp - caster.stats.hp);

          console.log(`[Lifesteal] ${caster.name} heals for ${actualHeal} (${effect.value * 100}% of ${totalDamageDealt} damage)`);

          if (actualHeal > 0) {
            caster.stats.hp += actualHeal;
            this.events.push({
              type: BattleEventType.Heal,
              tick: this.currentTick,
              data: {
                unit: caster.name,
                unitId: caster.id,
                amount: actualHeal,
                source: `${ability.name} (lifesteal)`
              }
            });
          }
        }
      }
    }

    // Update cooldowns for all abilities (they tick down over time)
    for (const [abilityId, cd] of caster.abilityCooldowns) {
      if (cd > 0) {
        caster.abilityCooldowns.set(abilityId, cd - 1);
      }
    }
  }

  /**
   * Add wave transition animation events
   */
  private addWaveTransition(nextWave: number) {
    const scrollDistance = 2; // Cells to scroll

    // Store hero positions before and after transition for animation
    const heroTransitions: Array<{ unitId: string, from: Position, to: Position }> = [];

    // Update hero positions (shift left) with collision detection
    const aliveHeroes = this.getAliveHeroes();

    // Sort heroes by column (leftmost first) to process in order
    const sortedHeroes = [...aliveHeroes].sort((a, b) => a.position.col - b.position.col);

    // Track new positions to avoid collisions
    const newPositions = new Map<string, Position>();
    const occupiedPositions = new Set<string>();

    sortedHeroes.forEach(hero => {
      const oldPos = { ...hero.position };

      // Calculate desired new position
      let desiredCol = Math.max(0, hero.position.col - scrollDistance - 1);
      let finalCol = desiredCol;

      // Check if position is occupied and find next available column
      while (finalCol < hero.position.col) {
        const posKey = `${hero.position.row},${finalCol}`;
        if (!occupiedPositions.has(posKey)) {
          // Found an available position
          break;
        }
        // Position occupied, try one column to the right
        finalCol++;
      }

      // If we couldn't find a better position, stay where we are
      if (finalCol >= hero.position.col) {
        finalCol = hero.position.col;
      }

      const newPos = { row: hero.position.row, col: finalCol };
      newPositions.set(hero.id, newPos);
      occupiedPositions.add(`${newPos.row},${newPos.col}`);

      // Store transition for the event
      heroTransitions.push({
        unitId: hero.id,
        from: oldPos,
        to: newPos
      });

      console.log(`[WaveTransition] Hero ${hero.name} (${hero.id}) moving from (${oldPos.row},${oldPos.col}) to (${newPos.row},${newPos.col})`);
    });

    // Add transition event with hero position data
    this.events.push({
      type: BattleEventType.WaveTransition,
      tick: this.currentTick,
      data: {
        waveNumber: nextWave,
        scrollDistance,
        duration: 1000,
        heroTransitions // Include position data for each hero
      }
    });

    // Apply all position updates
    sortedHeroes.forEach(hero => {
      const oldPos = { ...hero.position };
      const newPos = newPositions.get(hero.id)!;

      // Update occupancy grid
      this.clearOccupancy(oldPos);
      hero.position = newPos;
      this.setOccupancy(hero.position, hero.id);
    });
  }

  // ============= Helper Methods =============

  private getHeroStartPosition(index: number): Position {
    // Use 2 columns (0 and 1), spread across rows 2-7 (6 rows available)
    // Max 12 heroes can fit comfortably (6 rows × 2 columns)

    // Handle overflow first - if we have more than 12 heroes
    if (index >= 12) {
      const overflowIndex = index - 12; // How many past the first 12
      const overflowRow = Math.floor(overflowIndex / 2);
      // Wrap to available rows (0-7), cycling through if needed
      return {
        row: overflowRow % 8,
        col: overflowIndex % 2
      };
    }

    // Normal positioning for first 12 heroes
    const row = 2 + Math.floor(index / 2); // Start at row 2
    const col = index % 2; // Alternate between col 0 and 1

    // Log the first few positions for debugging
    if (index < 3) {
      console.log(`[V2 getHeroStartPosition] Hero ${index}: row=${row}, col=${col}`);
    }

    // Ensure row never exceeds 7
    return { row: Math.min(row, 7), col };
  }

  private getEnemyStartPosition(index: number): Position {
    // Use 2 columns (6 and 7), spread across rows 2-7 (6 rows available)
    // Max 12 enemies can fit comfortably (6 rows × 2 columns)

    // Handle overflow first - if we have more than 12 enemies
    if (index >= 12) {
      const overflowIndex = index - 12; // How many past the first 12
      const overflowRow = Math.floor(overflowIndex / 2);
      // Wrap to available rows (0-7), cycling through if needed
      return {
        row: overflowRow % 8,
        col: 7 - (overflowIndex % 2)
      };
    }

    // Normal positioning for first 12 enemies
    const row = 2 + Math.floor(index / 2); // Start at row 2
    const col = 7 - (index % 2); // Alternate between col 7 and 6

    // Ensure row never exceeds 7
    return { row: Math.min(row, 7), col };
  }

  private getAliveUnits(): SimulatedUnit[] {
    return Array.from(this.units.values()).filter(u => u.isAlive);
  }

  private getAliveHeroes(): SimulatedUnit[] {
    return Array.from(this.units.values()).filter(u => u.isAlive && u.isHero);
  }

  private getAliveEnemies(): SimulatedUnit[] {
    return Array.from(this.units.values()).filter(u => u.isAlive && !u.isHero && u.position.col < 8);
  }

  private getHeroes(): SimulatedUnit[] {
    return Array.from(this.units.values()).filter(u => u.isHero);
  }

  private getEnemies(): SimulatedUnit[] {
    // Only return enemies that are on the valid grid (col < 8)
    // This filters out later-wave enemies that haven't spawned yet
    const allEnemies = Array.from(this.units.values()).filter(u => !u.isHero);
    const validEnemies = allEnemies.filter(u => u.position.col < 8);

    // Debug: Log if we have any enemies with invalid positions
    const invalidEnemies = allEnemies.filter(u => u.position.col >= 8);
    if (invalidEnemies.length > 0) {
      console.log(`[getEnemies] Filtering out ${invalidEnemies.length} off-grid enemies`);
    }

    return validEnemies;
  }

  private getEnemyWaves(): number[] {
    const waves = new Set<number>();
    this.units.forEach(u => {
      if (!u.isHero && u.wave) {
        waves.add(u.wave);
      }
    });
    return Array.from(waves).sort((a, b) => a - b);
  }

  private unitToBattleUnit(unit: SimulatedUnit): BattleUnit | null {
    // Position should already be valid since getEnemies() filters out off-grid enemies
    const position = { ...unit.position };

    // Double-check for safety and reject invalid positions
    if (position.col >= 8 || position.row >= 8 || position.col < 0 || position.row < 0) {
      console.error(`[unitToBattleUnit] REJECTING Unit ${unit.name} with invalid position (${position.row},${position.col})`);
      return null; // Don't include units with invalid positions
    }

    return {
      id: unit.id,
      instanceId: unit.id, // BattleUnit doesn't have instanceId, just id
      name: unit.name,
      class: unit.class,
      spritePath: unit.spritePath,
      position,
      baseStats: { ...unit.stats }, // Base stats
      stats: { ...unit.stats }, // Current stats (same as base for now)
      statusEffects: [], // No status effects implemented yet
      isHero: unit.isHero,
      isAlive: unit.isAlive,
      range: 1, // Default melee range, could be calculated from abilities
      cooldown: unit.cooldown,
      cooldownRate: unit.cooldownRate,
      abilities: unit.abilities,
      abilityCooldowns: unit.abilityCooldowns,
      wave: unit.wave
    };
  }

  private findClosestTarget(attacker: SimulatedUnit, targets: SimulatedUnit[]): SimulatedUnit | null {
    if (targets.length === 0) return null;

    let closest = targets[0];
    let minDistance = this.getDistance(attacker.position, closest.position);

    for (const target of targets) {
      const distance = this.getDistance(attacker.position, target.position);
      if (distance < minDistance) {
        minDistance = distance;
        closest = target;
      }
    }

    return closest;
  }

  private findMovePosition(unit: SimulatedUnit, target: SimulatedUnit): Position | null {
    const currentDist = this.getDistance(unit.position, target.position);
    const adjacent = this.getAdjacentPositions(unit.position);

    // Filter out occupied positions
    const validPositions = adjacent.filter(pos => !this.isOccupied(pos));
    if (validPositions.length === 0) return null;

    // Calculate target direction
    const targetDx = target.position.col - unit.position.col;
    const targetDy = target.position.row - unit.position.row;

    // Score each position
    const scoredPositions = validPositions.map(pos => {
      const dist = this.getDistance(pos, target.position);
      const dx = pos.col - unit.position.col;
      const dy = pos.row - unit.position.row;

      let score = 0;

      // Primary scoring: Distance to target (lower is better)
      score += dist * 1000; // Heavy weight on distance

      // Penalize upward movement unless target is actually above
      if (dy < 0 && targetDy >= 0) {
        score += 500; // Strong penalty for moving up when target isn't above
      }

      // Penalize downward movement unless target is actually below
      if (dy > 0 && targetDy <= 0) {
        score += 500; // Strong penalty for moving down when target isn't below
      }

      // Strongly prefer horizontal movement when at similar vertical level
      if (Math.abs(targetDy) <= 1) {
        if (dx !== 0 && dy === 0) {
          score -= 300; // Bonus for pure horizontal movement
        }
        if (dx === 0 && dy !== 0) {
          score += 300; // Penalty for pure vertical movement
        }
      }

      // Prefer moving in the correct horizontal direction
      if (unit.isHero && targetDx > 0 && dx > 0) {
        score -= 100; // Heroes prefer moving right toward enemies
      } else if (!unit.isHero && targetDx < 0 && dx < 0) {
        score -= 100; // Enemies prefer moving left toward heroes
      }

      // Slight preference for diagonal moves that make progress in both axes
      if (dx !== 0 && dy !== 0) {
        const horizontalProgress = Math.sign(dx) === Math.sign(targetDx);
        const verticalProgress = Math.sign(dy) === Math.sign(targetDy);
        if (horizontalProgress && verticalProgress) {
          score -= 50; // Small bonus for diagonal progress
        }
      }

      return { pos, score, dist };
    });

    // Sort by score (lower is better)
    scoredPositions.sort((a, b) => a.score - b.score);

    // Only move if it improves our position
    const best = scoredPositions[0];
    if (best && best.dist <= currentDist) {
      return best.pos;
    }

    return null;
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

  private getDistance(a: Position, b: Position): number {
    return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
  }

  private posKey(pos: Position): string {
    return `${pos.row},${pos.col}`;
  }

  private isOccupied(pos: Position): boolean {
    return this.occupancy.has(this.posKey(pos));
  }

  private setOccupancy(pos: Position, unitId: string) {
    this.occupancy.set(this.posKey(pos), unitId);
  }

  private clearOccupancy(pos: Position) {
    this.occupancy.delete(this.posKey(pos));
  }
}