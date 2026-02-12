/**
 * DeterministicBattleSimulator V2
 *
 * A drop-in replacement for BattleSimulator that pre-computes all battle events
 * while maintaining 100% compatibility with the existing battle system.
 *
 * Key principle: Generate the EXACT same BattleEvent structure as the original system
 * so all existing hooks, animations, and systems work unchanged.
 */

import { Hero, Enemy, Ability, AbilityType, AbilityEffect, StatusEffect, StatusEffectType, UnitStats } from '@/types/core.types';
import {
  BattleState,
  BattleEvent,
  BattleEventType,
  BattleUnit
} from '@/types/battle.types';
import { getDistance, posKey } from '@/utils/targeting';
import { COOLDOWN_DIVISOR } from '@/utils/constants';

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
  baseStats: {
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
  statusEffects: StatusEffect[];
  cooldown: number;
  cooldownRate: number;
  abilities: Ability[];
  abilityCooldowns: Map<string, number>;
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
    // Start with existing events (from previous waves)
    this.events = [...existingEvents];
    this.currentTick = existingEvents.length > 0 ? Math.max(...existingEvents.map(e => e.tick)) : 0;

    const allEnemyWaves = this.getEnemyWaves();
    const totalWaves = allEnemyWaves.length;

    if (targetWave > totalWaves) {
      return this.buildBattleState(targetWave, totalWaves);
    }

    // When re-simulating from a later wave (e.g. after formation change),
    // kill enemies from previous waves so they don't block spawning or participate in combat
    if (targetWave > 1) {
      for (const unit of this.units.values()) {
        if (!unit.isHero && unit.wave !== undefined && unit.wave < targetWave) {
          unit.isAlive = false;
          if (unit.position.col < this.gridWidth) {
            this.clearOccupancy(unit.position);
          }
        }
      }
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
    if (aliveHeroes.length === 0) {
      winner = 'enemies';
    } else if (aliveEnemies.length === 0 && currentWave === totalWaves) {
      // Only a true victory if it's the last wave
      winner = 'heroes';
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

      // Validate position
      if (position.row < 0 || position.row >= 8 || position.col < 0 || position.col >= 8) {
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
        baseStats: { ...hero.currentStats },
        stats: { ...hero.currentStats },
        statusEffects: [],
        cooldown: 0,
        cooldownRate: hero.currentStats.speed / COOLDOWN_DIVISOR,
        abilities: [...hero.abilities],
        abilityCooldowns,
        isAlive: true,
        isHero: true
      };

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
            baseStats: { ...enemy.currentStats },
            stats: { ...enemy.currentStats },
            statusEffects: [],
            cooldown: 0,
            cooldownRate: enemy.currentStats.speed / COOLDOWN_DIVISOR,
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
          baseStats: { ...enemy.currentStats },
          stats: { ...enemy.currentStats },
          statusEffects: [],
          cooldown: 0,
          cooldownRate: enemy.currentStats.speed / COOLDOWN_DIVISOR,
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

      // Process status effects for all alive units (DoTs, regen, expiry)
      for (const unit of [...aliveHeroes, ...aliveEnemies]) {
        if (unit.statusEffects.length > 0) {
          this.processStatusEffects(unit);
          if (!unit.isAlive) continue; // Died from DoT
        }
      }

      // Re-check after status effects (someone might have died)
      if (this.getAliveHeroes().length === 0) return 'defeat';
      if (this.getAliveEnemies().length === 0) return 'victory';

      // Update cooldowns for all alive units
      const cooldownUpdates: any[] = [];
      [...this.getAliveHeroes(), ...this.getAliveEnemies()].forEach(unit => {
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
      const readyUnits = [...this.getAliveHeroes(), ...this.getAliveEnemies()].filter(u => u.cooldown >= 100);
      readyUnits.sort((a, b) => b.cooldown - a.cooldown);

      for (const unit of readyUnits) {
        if (!unit.isAlive) continue; // May have died during this tick

        // Check if unit is crowd-controlled
        if (this.isControlled(unit)) {
          unit.cooldown = 0;
          continue; // Skip turn
        }

        this.processUnitAction(unit);
        unit.cooldown = 0;
      }
    }

    return 'defeat'; // Timeout
  }

  /**
   * Process a single unit's action (abilities, move, or attack)
   */
  private processUnitAction(unit: SimulatedUnit) {
    const enemies = this.getAliveUnits().filter(u => u.isHero !== unit.isHero);
    const allies = this.getAliveUnits().filter(u => u.isHero === unit.isHero && u.id !== unit.id);

    if (enemies.length === 0) return;

    const nearestEnemy = this.findClosestTarget(unit, enemies);
    if (!nearestEnemy) return;

    const distance = this.getDistance(unit.position, nearestEnemy.position);
    const silenced = this.isSilenced(unit);
    const rooted = this.isRooted(unit);

    // Check if we can use an ability (not silenced)
    const usableAbility = silenced ? null : this.findUsableAbility(unit, nearestEnemy, enemies, allies);

    if (usableAbility) {
      this.useAbility(unit, usableAbility.ability, usableAbility.targets, enemies, allies);
      unit.abilityCooldowns.set(usableAbility.ability.id, usableAbility.ability.cooldown);
    } else if (distance > 1 && !rooted) {
      // Move closer (not rooted)
      const newPos = this.findMovePosition(unit, nearestEnemy);
      if (newPos && this.posKey(newPos) !== this.posKey(unit.position)) {
        const fromPos = { ...unit.position };
        const toPos = { ...newPos };

        this.events.push({
          type: BattleEventType.Move,
          tick: this.currentTick,
          data: { unit: unit.name, unitId: unit.id, from: fromPos, to: toPos }
        });

        this.clearOccupancy(unit.position);
        unit.position = newPos;
        this.setOccupancy(newPos, unit.id);
      }
    } else if (distance <= 1) {
      // Basic attack with shield absorption
      const rawDamage = Math.max(1, unit.stats.damage - Math.floor(nearestEnemy.stats.defense * 0.3));
      const actualDamage = this.applyShieldAbsorption(nearestEnemy, rawDamage);

      this.events.push({
        type: BattleEventType.Attack,
        tick: this.currentTick,
        data: {
          attacker: unit.name, attackerId: unit.id,
          target: nearestEnemy.name, targetId: nearestEnemy.id,
          damage: rawDamage
        }
      });

      nearestEnemy.stats.hp -= actualDamage;

      this.events.push({
        type: BattleEventType.Damage,
        tick: this.currentTick,
        data: {
          target: nearestEnemy.name, targetId: nearestEnemy.id,
          damage: actualDamage, remainingHp: Math.max(0, nearestEnemy.stats.hp)
        }
      });

      if (nearestEnemy.stats.hp <= 0) {
        nearestEnemy.isAlive = false;
        this.clearOccupancy(nearestEnemy.position);
        this.events.push({
          type: BattleEventType.Death,
          tick: this.currentTick,
          data: { unit: nearestEnemy.name, unitId: nearestEnemy.id }
        });
      }
    }
  }

  /**
   * Find a usable ability for the unit
   * Priority: heal critical ally > offensive ability > buff/support
   */
  private findUsableAbility(unit: SimulatedUnit, mainTarget: SimulatedUnit, enemies: SimulatedUnit[], allies: SimulatedUnit[]):
    { ability: Ability, targets: SimulatedUnit[] } | null {

    let bestOffensive: { ability: Ability, targets: SimulatedUnit[] } | null = null;
    let bestSupport: { ability: Ability, targets: SimulatedUnit[] } | null = null;

    // Check for critically low HP allies (below 40%)
    const criticalAlly = allies
      .filter(a => a.isAlive && a.stats.hp / a.stats.maxHp < 0.4)
      .sort((a, b) => a.stats.hp / a.stats.maxHp - b.stats.hp / b.stats.maxHp)[0];

    for (const ability of unit.abilities) {
      const cooldown = unit.abilityCooldowns.get(ability.id) || 0;
      if (cooldown > 0) continue;

      const hasHealEffect = ability.effects.some(e => e.type === 'heal' || e.type === 'revive');
      const hasOffensiveEffect = ability.effects.some(e =>
        e.type === 'damage' || e.type === 'debuff' || e.type === 'status' ||
        e.type === 'execute' || e.type === 'lifesteal'
      );
      const hasBuffEffect = ability.effects.some(e =>
        e.type === 'buff' || e.type === 'shield'
      );

      // Heal abilities: prioritize when ally is critical
      if (hasHealEffect && criticalAlly) {
        return { ability, targets: [criticalAlly] };
      }

      // Offensive abilities: check range to main target
      if (hasOffensiveEffect) {
        const range = ability.range || 1;
        const distance = this.getDistance(unit.position, mainTarget.position);
        if (distance <= range && !bestOffensive) {
          bestOffensive = { ability, targets: [mainTarget] };
        }
      }

      // Support abilities: use if no ally already has this buff
      if (hasBuffEffect && !bestSupport) {
        const alreadyBuffed = allies.some(a =>
          a.statusEffects.some(e => e.source === unit.id && e.type === 'buff' && e.remainingDuration > 0)
        );
        if (!alreadyBuffed) {
          bestSupport = { ability, targets: allies.filter(a => a.isAlive) };
        }
      }
    }

    return bestOffensive || bestSupport || null;
  }

  /**
   * Use an ability - handles all effect types
   */
  private useAbility(
    caster: SimulatedUnit,
    ability: Ability,
    targets: SimulatedUnit[],
    allEnemies: SimulatedUnit[] = [],
    allAllies: SimulatedUnit[] = []
  ) {
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

    let totalDamageDealt = 0;
    const mainTarget = targets[0] || null;

    // Determine which group is enemies/allies from caster perspective
    const enemiesOfCaster = caster.isHero
      ? this.getAliveUnits().filter(u => !u.isHero)
      : this.getAliveUnits().filter(u => u.isHero);
    const alliesOfCaster = this.getAliveUnits().filter(u => u.isHero === caster.isHero && u.id !== caster.id);

    for (const effect of ability.effects) {
      // Resolve targets based on effect targetType
      const actualTargets = this.resolveTargets(caster, effect, mainTarget, alliesOfCaster, enemiesOfCaster);

      for (const target of actualTargets) {
        if (!target.isAlive && effect.type !== 'revive') continue;

        switch (effect.type) {
          case 'damage': {
            if (!effect.value) break;
            const rawDamage = effect.value;
            const damage = Math.max(1, rawDamage - Math.floor(target.stats.defense * 0.3));
            // Splash targets take 50% damage
            const isSplash = effect.targetType === 'splash' && target.id !== mainTarget?.id;
            const finalRaw = isSplash ? Math.floor(damage * 0.5) : damage;
            const finalDamage = this.applyShieldAbsorption(target, finalRaw);

            target.stats.hp -= finalDamage;
            totalDamageDealt += finalDamage;

            this.events.push({
              type: BattleEventType.Damage,
              tick: this.currentTick,
              data: {
                target: target.name, targetId: target.id,
                damage: finalDamage, remainingHp: Math.max(0, target.stats.hp),
                source: 'ability', abilityName: ability.name
              }
            });

            if (target.stats.hp <= 0) {
              target.isAlive = false;
              this.clearOccupancy(target.position);
              this.events.push({
                type: BattleEventType.Death,
                tick: this.currentTick,
                data: { unit: target.name, unitId: target.id, cause: ability.name }
              });
            }
            break;
          }

          case 'heal': {
            if (!effect.value) break;
            const healing = Math.min(effect.value, target.stats.maxHp - target.stats.hp);
            if (healing > 0) {
              target.stats.hp += healing;
              this.events.push({
                type: BattleEventType.Heal,
                tick: this.currentTick,
                data: { unit: target.name, unitId: target.id, amount: healing, source: ability.name }
              });
            }
            break;
          }

          case 'lifesteal': {
            if (!effect.value || totalDamageDealt <= 0) break;
            const healAmount = Math.floor(totalDamageDealt * effect.value);
            const actualHeal = Math.min(healAmount, caster.stats.maxHp - caster.stats.hp);
            if (actualHeal > 0) {
              caster.stats.hp += actualHeal;
              this.events.push({
                type: BattleEventType.Heal,
                tick: this.currentTick,
                data: { unit: caster.name, unitId: caster.id, amount: actualHeal, source: `${ability.name} (lifesteal)` }
              });
            }
            break;
          }

          case 'buff': {
            const status = this.createStatusEffect(effect, caster.id, ability.name);
            status.type = 'buff';
            this.applyStatusEffect(target, status);
            this.events.push({
              type: BattleEventType.StatusApplied,
              tick: this.currentTick,
              data: { unitId: target.id, statusType: status.statusType, name: status.name, duration: status.duration, source: caster.id }
            });
            break;
          }

          case 'debuff': {
            const status = this.createStatusEffect(effect, caster.id, ability.name);
            status.type = 'debuff';
            this.applyStatusEffect(target, status);
            this.events.push({
              type: BattleEventType.StatusApplied,
              tick: this.currentTick,
              data: { unitId: target.id, statusType: status.statusType, name: status.name, duration: status.duration, source: caster.id }
            });
            break;
          }

          case 'shield': {
            const shieldAmount = effect.value || 50;
            const status: StatusEffect = {
              id: `shield_${caster.id}_${Date.now()}`,
              name: 'Shield',
              type: 'buff',
              statusType: StatusEffectType.Shield,
              duration: effect.duration || 5,
              remainingDuration: effect.duration || 5,
              shieldAmount,
              source: caster.id,
            };
            this.applyStatusEffect(target, status);
            this.events.push({
              type: BattleEventType.StatusApplied,
              tick: this.currentTick,
              data: { unitId: target.id, statusType: 'shield', name: 'Shield', shieldAmount, source: caster.id }
            });
            break;
          }

          case 'status': {
            const status = this.createStatusEffect(effect, caster.id, ability.name);
            this.applyStatusEffect(target, status);
            this.events.push({
              type: BattleEventType.StatusApplied,
              tick: this.currentTick,
              data: { unitId: target.id, statusType: status.statusType, name: status.name, duration: status.duration, source: caster.id }
            });
            break;
          }

          case 'execute': {
            if (!effect.value) break;
            const hpPercent = target.stats.hp / target.stats.maxHp;
            const threshold = (effect.conditionValue || 30) / 100;
            const multiplier = hpPercent < threshold ? (effect.damageMultiplier || 3) : 1;
            const rawDamage = Math.floor(effect.value * multiplier);
            const damage = Math.max(1, rawDamage - Math.floor(target.stats.defense * 0.3));
            const finalDamage = this.applyShieldAbsorption(target, damage);

            target.stats.hp -= finalDamage;
            totalDamageDealt += finalDamage;

            this.events.push({
              type: BattleEventType.Damage,
              tick: this.currentTick,
              data: {
                target: target.name, targetId: target.id,
                damage: finalDamage, remainingHp: Math.max(0, target.stats.hp),
                source: 'ability', abilityName: ability.name,
                isExecute: hpPercent < threshold
              }
            });

            if (target.stats.hp <= 0) {
              target.isAlive = false;
              this.clearOccupancy(target.position);
              this.events.push({
                type: BattleEventType.Death,
                tick: this.currentTick,
                data: { unit: target.name, unitId: target.id, cause: ability.name }
              });
            }
            break;
          }

          case 'revive': {
            // Find a dead ally to revive
            const deadAllies = this.getUnitsForSide(caster.isHero).filter(a => !a.isAlive);
            if (deadAllies.length === 0) break;

            const reviveTarget = deadAllies[0];
            const reviveHpPercent = (effect.value || 50) / 100;
            reviveTarget.stats.hp = Math.floor(reviveTarget.stats.maxHp * reviveHpPercent);
            reviveTarget.isAlive = true;

            // Find an open position near caster
            const adjPositions = this.getAdjacentPositions(caster.position);
            const openPos = adjPositions.find(p => !this.isOccupied(p));
            if (openPos) {
              reviveTarget.position = openPos;
              this.setOccupancy(openPos, reviveTarget.id);
            }

            this.events.push({
              type: BattleEventType.Heal,
              tick: this.currentTick,
              data: {
                unit: reviveTarget.name, unitId: reviveTarget.id,
                amount: reviveTarget.stats.hp, source: `${ability.name} (revive)`
              }
            });
            break;
          }

          case 'summon': {
            // Summon is complex - for now emit the event and the animation plays
            // Full summon logic would create new units, which is beyond this phase
            break;
          }

          case 'conditional': {
            if (!effect.value) break;
            // Check condition
            let conditionMet = false;
            if (effect.condition === 'target_below_hp_percent') {
              conditionMet = (target.stats.hp / target.stats.maxHp) < ((effect.conditionValue || 50) / 100);
            } else if (effect.condition === 'target_has_debuff') {
              conditionMet = target.statusEffects.some(e => e.type === 'debuff' && e.remainingDuration > 0);
            } else if (effect.condition === 'self_below_hp_percent') {
              conditionMet = (caster.stats.hp / caster.stats.maxHp) < ((effect.conditionValue || 50) / 100);
            }

            const multiplier = conditionMet ? (effect.damageMultiplier || 2) : 1;
            const rawDamage = Math.floor(effect.value * multiplier);
            const damage = Math.max(1, rawDamage - Math.floor(target.stats.defense * 0.3));
            const finalDamage = this.applyShieldAbsorption(target, damage);

            target.stats.hp -= finalDamage;
            totalDamageDealt += finalDamage;

            this.events.push({
              type: BattleEventType.Damage,
              tick: this.currentTick,
              data: {
                target: target.name, targetId: target.id,
                damage: finalDamage, remainingHp: Math.max(0, target.stats.hp),
                source: 'ability', abilityName: ability.name
              }
            });

            if (target.stats.hp <= 0) {
              target.isAlive = false;
              this.clearOccupancy(target.position);
              this.events.push({
                type: BattleEventType.Death,
                tick: this.currentTick,
                data: { unit: target.name, unitId: target.id, cause: ability.name }
              });
            }
            break;
          }
        }
      }
    }

    // Tick down all ability cooldowns
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

  // ============= Target Resolution =============

  /**
   * Resolve targets for an ability effect based on its targetType
   */
  private resolveTargets(
    caster: SimulatedUnit,
    effect: AbilityEffect,
    mainTarget: SimulatedUnit | null,
    allies: SimulatedUnit[],
    enemies: SimulatedUnit[]
  ): SimulatedUnit[] {
    switch (effect.targetType) {
      case 'self':
        return [caster];

      case 'enemy':
        return mainTarget ? [mainTarget] : [];

      case 'ally': {
        // Find lowest-HP living ally
        const aliveAllies = allies.filter(a => a.isAlive);
        if (aliveAllies.length === 0) return [];
        return [aliveAllies.reduce((lowest, current) =>
          (current.stats.hp / current.stats.maxHp) < (lowest.stats.hp / lowest.stats.maxHp) ? current : lowest
        )];
      }

      case 'allAllies':
        return [caster, ...allies.filter(a => a.isAlive)];

      case 'allEnemies':
        return enemies.filter(e => e.isAlive);

      case 'aoe': {
        if (!mainTarget) return [];
        const radius = effect.radius || 1;
        return enemies.filter(e => e.isAlive &&
          this.getDistance(e.position, mainTarget.position) <= radius
        );
      }

      case 'splash': {
        if (!mainTarget) return [];
        const radius = effect.radius || 1;
        // Primary target gets full damage, others in radius get hit too
        const splashTargets = enemies.filter(e =>
          e.isAlive && e.id !== mainTarget.id &&
          this.getDistance(e.position, mainTarget.position) <= radius
        );
        return [mainTarget, ...splashTargets];
      }

      case 'line': {
        if (!mainTarget) return [];
        // All units on the line between caster and mainTarget (same row ±1)
        const minCol = Math.min(caster.position.col, mainTarget.position.col);
        const maxCol = Math.max(caster.position.col, mainTarget.position.col);
        return enemies.filter(e =>
          e.isAlive &&
          Math.abs(e.position.row - caster.position.row) <= 1 &&
          e.position.col >= minCol && e.position.col <= maxCol
        );
      }

      case 'cone': {
        if (!mainTarget) return [];
        // 3-wide cone from caster toward target
        const dir = mainTarget.position.col > caster.position.col ? 1 : -1;
        return enemies.filter(e => {
          if (!e.isAlive) return false;
          const colDist = (e.position.col - caster.position.col) * dir;
          const rowDist = Math.abs(e.position.row - caster.position.row);
          return colDist > 0 && colDist <= 3 && rowDist <= Math.ceil(colDist / 2);
        });
      }

      default:
        return mainTarget ? [mainTarget] : [];
    }
  }

  /**
   * Calculate the range of a unit based on its abilities
   */
  private getUnitRange(unit: SimulatedUnit): number {
    let maxRange = 1;
    for (const ability of unit.abilities) {
      if (ability.range && ability.range > maxRange) {
        maxRange = ability.range;
      }
    }
    return maxRange;
  }

  // ============= Status Effect Processing =============

  /**
   * Create a StatusEffect from an ability effect
   */
  private createStatusEffect(
    effect: AbilityEffect,
    sourceId: string,
    sourceName: string
  ): StatusEffect {
    const statusType = effect.statusType || StatusEffectType.Weakened;
    const duration = effect.duration || 3;

    // Determine effect category
    let type: 'buff' | 'debuff' | 'control' | 'dot' | 'special' = 'debuff';
    const controlTypes: StatusEffectType[] = [
      StatusEffectType.Stun, StatusEffectType.Root, StatusEffectType.Silence,
      StatusEffectType.Fear, StatusEffectType.Sleep, StatusEffectType.Charm,
      StatusEffectType.Disarm
    ];
    const dotTypes: StatusEffectType[] = [
      StatusEffectType.Burn, StatusEffectType.Poison, StatusEffectType.Bleed
    ];
    const buffTypes: StatusEffectType[] = [
      StatusEffectType.Shield, StatusEffectType.Regeneration, StatusEffectType.Enrage,
      StatusEffectType.Frenzy, StatusEffectType.Fortify, StatusEffectType.Haste,
      StatusEffectType.Invisibility, StatusEffectType.Incorporeal
    ];

    if (controlTypes.includes(statusType)) type = 'control';
    else if (dotTypes.includes(statusType)) type = 'dot';
    else if (buffTypes.includes(statusType)) type = 'buff';

    return {
      id: `${statusType}_${sourceId}_${Date.now()}`,
      name: statusType.replace(/_/g, ' '),
      type,
      statusType,
      stat: effect.statModifier?.stat,
      value: effect.statModifier?.value || effect.value,
      isPercent: effect.statModifier?.isPercent,
      duration,
      remainingDuration: duration,
      damagePerTick: dotTypes.includes(statusType) ? (effect.value || 0) : undefined,
      shieldAmount: statusType === StatusEffectType.Shield ? (effect.value || 0) : undefined,
      source: sourceId,
    };
  }

  /**
   * Apply a status effect to a unit and recalculate stats
   */
  private applyStatusEffect(unit: SimulatedUnit, status: StatusEffect) {
    unit.statusEffects.push(status);
    this.recalculateStats(unit);
  }

  /**
   * Recalculate a unit's stats from baseStats + active status effects
   */
  private recalculateStats(unit: SimulatedUnit) {
    const hp = unit.stats.hp; // Preserve current HP
    unit.stats = { ...unit.baseStats };
    unit.stats.hp = hp; // Restore current HP

    for (const effect of unit.statusEffects) {
      if (effect.remainingDuration <= 0) continue;
      if (effect.stat && effect.value !== undefined) {
        const stat = effect.stat as keyof typeof unit.stats;
        if (stat in unit.stats && stat !== 'hp' && stat !== 'maxHp') {
          if (effect.isPercent) {
            (unit.stats as any)[stat] = Math.floor((unit.stats as any)[stat] * (1 + effect.value / 100));
          } else {
            (unit.stats as any)[stat] += effect.value;
          }
        }
      }
    }

    // Update cooldownRate based on current speed
    unit.cooldownRate = unit.stats.speed / COOLDOWN_DIVISOR;
  }

  /**
   * Process status effects for a unit (DoTs, regen, expiry)
   */
  private processStatusEffects(unit: SimulatedUnit): void {
    const expiredEffects: StatusEffect[] = [];

    for (const effect of unit.statusEffects) {
      // DoT damage (Burn, Poison, Bleed)
      if (effect.damagePerTick && effect.damagePerTick > 0) {
        unit.stats.hp -= effect.damagePerTick;
        this.events.push({
          type: BattleEventType.Damage,
          tick: this.currentTick,
          data: {
            target: unit.name,
            targetId: unit.id,
            damage: effect.damagePerTick,
            remainingHp: Math.max(0, unit.stats.hp),
            source: effect.name,
          }
        });

        if (unit.stats.hp <= 0) {
          unit.isAlive = false;
          this.clearOccupancy(unit.position);
          this.events.push({
            type: BattleEventType.Death,
            tick: this.currentTick,
            data: { unit: unit.name, unitId: unit.id, cause: effect.name }
          });
          return; // Dead, no more processing
        }
      }

      // Regeneration
      if (effect.statusType === StatusEffectType.Regeneration && effect.value) {
        const healing = Math.min(effect.value, unit.stats.maxHp - unit.stats.hp);
        if (healing > 0) {
          unit.stats.hp += healing;
          this.events.push({
            type: BattleEventType.Heal,
            tick: this.currentTick,
            data: {
              unit: unit.name, unitId: unit.id,
              amount: healing, source: 'Regeneration'
            }
          });
        }
      }

      // Decrement duration
      effect.remainingDuration--;
      if (effect.remainingDuration <= 0) {
        expiredEffects.push(effect);
      }
    }

    // Remove expired effects
    if (expiredEffects.length > 0) {
      unit.statusEffects = unit.statusEffects.filter(e => e.remainingDuration > 0);
      this.recalculateStats(unit);
      for (const expired of expiredEffects) {
        this.events.push({
          type: BattleEventType.StatusExpired,
          tick: this.currentTick,
          data: { unitId: unit.id, statusType: expired.statusType, name: expired.name }
        });
      }
    }
  }

  /**
   * Check if a unit is crowd-controlled (cannot act)
   */
  private isControlled(unit: SimulatedUnit): boolean {
    return unit.statusEffects.some(e =>
      e.remainingDuration > 0 && (
        e.statusType === StatusEffectType.Stun ||
        e.statusType === StatusEffectType.Fear ||
        e.statusType === StatusEffectType.Sleep ||
        e.statusType === StatusEffectType.Charm
      )
    );
  }

  /**
   * Check if a unit is rooted (can act but not move)
   */
  private isRooted(unit: SimulatedUnit): boolean {
    return unit.statusEffects.some(e =>
      e.remainingDuration > 0 && (
        e.statusType === StatusEffectType.Root ||
        e.statusType === StatusEffectType.Entangle
      )
    );
  }

  /**
   * Check if a unit is silenced (can't use abilities)
   */
  private isSilenced(unit: SimulatedUnit): boolean {
    return unit.statusEffects.some(e =>
      e.remainingDuration > 0 && e.statusType === StatusEffectType.Silence
    );
  }

  /**
   * Apply shield absorption before HP damage. Returns remaining damage after shields.
   */
  private applyShieldAbsorption(target: SimulatedUnit, damage: number): number {
    const shieldEffects = target.statusEffects.filter(
      e => e.statusType === StatusEffectType.Shield && e.shieldAmount && e.shieldAmount > 0
    );

    let remaining = damage;
    for (const shield of shieldEffects) {
      if (remaining <= 0) break;
      const absorbed = Math.min(shield.shieldAmount!, remaining);
      shield.shieldAmount! -= absorbed;
      remaining -= absorbed;
      if (shield.shieldAmount! <= 0) {
        shield.remainingDuration = 0; // Expire broken shield
      }
    }

    return remaining;
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

  private getUnitsForSide(isHero: boolean): SimulatedUnit[] {
    return Array.from(this.units.values()).filter(u => u.isHero === isHero);
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
      return null; // Don't include units with invalid positions
    }

    return {
      id: unit.id,
      instanceId: unit.id,
      name: unit.name,
      class: unit.class,
      spritePath: unit.spritePath,
      position,
      baseStats: { ...unit.baseStats },
      stats: { ...unit.stats },
      statusEffects: [...unit.statusEffects],
      isHero: unit.isHero,
      isAlive: unit.isAlive,
      range: this.getUnitRange(unit),
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
    return getDistance(a, b);
  }

  private posKey(pos: Position): string {
    return posKey(pos);
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