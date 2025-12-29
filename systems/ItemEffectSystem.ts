import { Item, ItemInstance, StatusEffectType } from '@/types/core.types';
import { BattleState, BattleUnit } from '@/systems/BattleSimulator';

export interface ItemSpecialEffect {
  id: string;
  chance?: number; // 0-100 percentage
  onAttack?: (attacker: BattleUnit, target: BattleUnit, damage: number, battle: BattleState) => void;
  onDefend?: (defender: BattleUnit, attacker: BattleUnit, damage: number, battle: BattleState) => number; // Returns modified damage
  onTurnStart?: (unit: BattleUnit, battle: BattleState) => void;
  onTurnEnd?: (unit: BattleUnit, battle: BattleState) => void;
  onKill?: (killer: BattleUnit, victim: BattleUnit, battle: BattleState) => void;
  onDeath?: (unit: BattleUnit, killer: BattleUnit | null, battle: BattleState) => void;
}

// Map of item IDs to their special effects
export const ITEM_SPECIAL_EFFECTS: Record<string, ItemSpecialEffect> = {
  // ===========================================
  // WARRIOR WEAPONS
  // ===========================================

  steel_axe: {
    id: 'steel_axe',
    chance: 10,
    onAttack: (attacker, target, damage, battle) => {
      if (Math.random() * 100 < 10) {
        // Deal double damage
        const extraDamage = damage;
        target.currentHp = Math.max(0, target.currentHp - extraDamage);
        battle.events.push({
          type: 'critical',
          timestamp: Date.now(),
          data: {
            attackerId: attacker.id,
            targetId: target.id,
            damage: extraDamage,
            source: 'Steel Axe (2x damage)'
          }
        });
      }
    }
  },

  flaming_greatsword: {
    id: 'flaming_greatsword',
    onAttack: (attacker, target, damage, battle) => {
      // Apply burning status
      if (!target.statusEffects) target.statusEffects = [];

      const existingBurn = target.statusEffects.find(e => e.type === StatusEffectType.Burning);
      if (!existingBurn) {
        target.statusEffects.push({
          type: StatusEffectType.Burning,
          duration: 3,
          damagePerTick: 5,
          source: 'Flaming Greatsword'
        });

        battle.events.push({
          type: 'statusApplied',
          timestamp: Date.now(),
          data: {
            targetId: target.id,
            status: 'Burning',
            duration: 3,
            source: 'Flaming Greatsword'
          }
        });
      }
    }
  },

  sword_of_kings: {
    id: 'sword_of_kings',
    onAttack: (attacker, target, damage, battle) => {
      // Track attack count
      if (!attacker.metadata) attacker.metadata = {};
      attacker.metadata.swordOfKingsCounter = (attacker.metadata.swordOfKingsCounter || 0) + 1;

      // Every 5th attack
      if (attacker.metadata.swordOfKingsCounter >= 5) {
        attacker.metadata.swordOfKingsCounter = 0;

        // Deal 5x damage
        const megaDamage = damage * 4; // 4x extra (5x total)
        target.currentHp = Math.max(0, target.currentHp - megaDamage);

        // Apply stun
        if (!target.statusEffects) target.statusEffects = [];
        target.statusEffects.push({
          type: StatusEffectType.Stun,
          duration: 1,
          source: 'Sword of Kings'
        });

        battle.events.push({
          type: 'megaStrike',
          timestamp: Date.now(),
          data: {
            attackerId: attacker.id,
            targetId: target.id,
            damage: megaDamage,
            effect: 'Stun (1 sec)',
            source: 'Sword of Kings (5th attack)'
          }
        });
      }
    }
  },

  excalibur: {
    id: 'excalibur',
    onAttack: (attacker, target, damage, battle) => {
      // Heal wielder for 20% of damage dealt
      const healAmount = Math.floor(damage * 0.2);
      attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);

      // Cleave to adjacent enemies
      const enemies = attacker.isHero ? battle.enemies : battle.heroes;
      const adjacentEnemies = enemies.filter(e => {
        if (!e.isAlive || e.id === target.id) return false;
        const rowDiff = Math.abs(e.position.row - target.position.row);
        const colDiff = Math.abs(e.position.col - target.position.col);
        return rowDiff <= 1 && colDiff <= 1; // Adjacent tiles
      });

      adjacentEnemies.forEach(enemy => {
        const cleaveDamage = Math.floor(damage * 0.5); // 50% damage to adjacent
        enemy.currentHp = Math.max(0, enemy.currentHp - cleaveDamage);

        battle.events.push({
          type: 'cleave',
          timestamp: Date.now(),
          data: {
            attackerId: attacker.id,
            targetId: enemy.id,
            damage: cleaveDamage,
            source: 'Excalibur (Cleave)'
          }
        });
      });

      battle.events.push({
        type: 'lifesteal',
        timestamp: Date.now(),
        data: {
          unitId: attacker.id,
          amount: healAmount,
          source: 'Excalibur'
        }
      });
    }
  },

  // ===========================================
  // ROGUE WEAPONS
  // ===========================================

  dual_daggers_of_venom: {
    id: 'dual_daggers_of_venom',
    onAttack: (attacker, target, damage, battle) => {
      // Apply poison
      if (!target.statusEffects) target.statusEffects = [];

      const existingPoison = target.statusEffects.find(e => e.type === StatusEffectType.Poison);
      if (!existingPoison) {
        target.statusEffects.push({
          type: StatusEffectType.Poison,
          duration: 4,
          damagePerTick: 8,
          source: 'Dual Daggers of Venom'
        });

        battle.events.push({
          type: 'statusApplied',
          timestamp: Date.now(),
          data: {
            targetId: target.id,
            status: 'Poison',
            duration: 4,
            source: 'Dual Daggers of Venom'
          }
        });
      }
    }
  },

  shadowstrike_blades: {
    id: 'shadowstrike_blades',
    onAttack: (attacker, target, damage, battle) => {
      // Check if attacking from behind (simplified: if attacker col < target col)
      const isFlanking = attacker.position.col < target.position.col;

      if (isFlanking) {
        // Triple damage from behind
        const backstabDamage = damage * 2; // 2x extra (3x total)
        target.currentHp = Math.max(0, target.currentHp - backstabDamage);

        // Grant invisibility
        if (!attacker.statusEffects) attacker.statusEffects = [];
        attacker.statusEffects.push({
          type: StatusEffectType.Invisible,
          duration: 2,
          source: 'Shadowstrike Blades'
        });

        battle.events.push({
          type: 'backstab',
          timestamp: Date.now(),
          data: {
            attackerId: attacker.id,
            targetId: target.id,
            damage: backstabDamage,
            effect: 'Invisibility (2 sec)',
            source: 'Shadowstrike Blades'
          }
        });
      }
    }
  },

  // ===========================================
  // ARMOR SPECIAL EFFECTS
  // ===========================================

  chainmail: {
    id: 'chainmail',
    onDefend: (defender, attacker, damage, battle) => {
      // Check if it's a critical hit (simplified: if damage > normal threshold)
      const isCrit = damage > (attacker.damage * 1.5);

      if (isCrit) {
        // Reduce critical damage by 30%
        const reducedDamage = Math.floor(damage * 0.7);

        battle.events.push({
          type: 'damageReduction',
          timestamp: Date.now(),
          data: {
            defenderId: defender.id,
            originalDamage: damage,
            reducedDamage: reducedDamage,
            source: 'Chainmail (Crit reduction)'
          }
        });

        return reducedDamage;
      }

      return damage;
    }
  },

  plate_armor_of_thorns: {
    id: 'plate_armor_of_thorns',
    onDefend: (defender, attacker, damage, battle) => {
      // Reflect 20% of melee damage
      const reflectDamage = Math.floor(damage * 0.2);
      attacker.currentHp = Math.max(0, attacker.currentHp - reflectDamage);

      battle.events.push({
        type: 'reflect',
        timestamp: Date.now(),
        data: {
          defenderId: defender.id,
          attackerId: attacker.id,
          damage: reflectDamage,
          source: 'Plate Armor of Thorns'
        }
      });

      return damage; // Original damage still applies
    }
  },

  dragonscale_armor: {
    id: 'dragonscale_armor',
    onDefend: (defender, attacker, damage, battle) => {
      // Check for fire damage (simplified check)
      const isFireDamage = attacker.abilities?.some(a =>
        a.id === 'fireball' || a.name?.toLowerCase().includes('fire')
      );

      if (isFireDamage) {
        // Immune to fire
        battle.events.push({
          type: 'immune',
          timestamp: Date.now(),
          data: {
            defenderId: defender.id,
            damageType: 'Fire',
            source: 'Dragonscale Armor'
          }
        });
        return 0;
      }

      // Emergency shield when low HP
      if (defender.currentHp / defender.maxHp <= 0.3 && !defender.metadata?.dragonscaleUsed) {
        if (!defender.metadata) defender.metadata = {};
        defender.metadata.dragonscaleUsed = true;

        const shieldAmount = Math.floor(defender.maxHp * 0.5);
        if (!defender.shield) defender.shield = 0;
        defender.shield += shieldAmount;

        battle.events.push({
          type: 'shield',
          timestamp: Date.now(),
          data: {
            unitId: defender.id,
            amount: shieldAmount,
            source: 'Dragonscale Armor (Emergency Shield)'
          }
        });
      }

      return damage;
    }
  },

  // ===========================================
  // ACCESSORY SPECIAL EFFECTS
  // ===========================================

  vampire_ring: {
    id: 'vampire_ring',
    onAttack: (attacker, target, damage, battle) => {
      // 15% lifesteal
      const healAmount = Math.floor(damage * 0.15);
      attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);

      battle.events.push({
        type: 'lifesteal',
        timestamp: Date.now(),
        data: {
          unitId: attacker.id,
          amount: healAmount,
          source: 'Vampire Ring'
        }
      });
    }
  },

  phoenix_pendant: {
    id: 'phoenix_pendant',
    onDeath: (unit, killer, battle) => {
      // Check if resurrection already used
      if (!unit.metadata) unit.metadata = {};
      if (unit.metadata.phoenixUsed) return;

      unit.metadata.phoenixUsed = true;
      unit.isAlive = true;
      unit.currentHp = Math.floor(unit.maxHp * 0.3);

      battle.events.push({
        type: 'resurrect',
        timestamp: Date.now(),
        data: {
          unitId: unit.id,
          hp: unit.currentHp,
          source: 'Phoenix Pendant'
        }
      });
    }
  },

  berserker_totem: {
    id: 'berserker_totem',
    onTurnStart: (unit, battle) => {
      // Calculate damage bonus based on missing HP
      const hpPercent = unit.currentHp / unit.maxHp;
      const missingHpPercent = (1 - hpPercent) * 100;
      const damageBonus = Math.min(40, Math.floor(missingHpPercent / 10) * 5);

      if (damageBonus > 0) {
        // Apply damage buff
        if (!unit.buffs) unit.buffs = [];
        unit.buffs.push({
          type: 'damage',
          value: 1 + (damageBonus / 100),
          duration: 1, // This turn only
          source: 'Berserker Totem'
        });

        battle.events.push({
          type: 'buff',
          timestamp: Date.now(),
          data: {
            unitId: unit.id,
            buffType: 'damage',
            value: damageBonus,
            source: `Berserker Totem (+${damageBonus}% damage)`
          }
        });
      }
    }
  },

  heartstone: {
    id: 'heartstone',
    onDefend: (defender, attacker, damage, battle) => {
      // Prevent one-shots (damage can't reduce HP below 1 from a single hit)
      if (defender.currentHp > 1 && damage >= defender.currentHp) {
        const cappedDamage = defender.currentHp - 1;

        battle.events.push({
          type: 'damageCap',
          timestamp: Date.now(),
          data: {
            defenderId: defender.id,
            originalDamage: damage,
            cappedDamage: cappedDamage,
            source: 'Heartstone (One-shot protection)'
          }
        });

        return cappedDamage;
      }

      return damage;
    }
  }
};

// Apply item effects during battle
export class ItemEffectSystem {
  // Process attack with item effects
  static processAttack(
    attacker: BattleUnit,
    target: BattleUnit,
    baseDamage: number,
    battle: BattleState
  ): number {
    let damage = baseDamage;

    // Apply attacker's weapon effects
    const attackerItems = this.getUnitItems(attacker);
    attackerItems.forEach(item => {
      const effect = ITEM_SPECIAL_EFFECTS[item.id];
      if (effect?.onAttack) {
        effect.onAttack(attacker, target, damage, battle);
      }
    });

    // Apply defender's armor effects
    const defenderItems = this.getUnitItems(target);
    defenderItems.forEach(item => {
      const effect = ITEM_SPECIAL_EFFECTS[item.id];
      if (effect?.onDefend) {
        damage = effect.onDefend(target, attacker, damage, battle);
      }
    });

    return damage;
  }

  // Process turn start
  static processTurnStart(unit: BattleUnit, battle: BattleState) {
    const items = this.getUnitItems(unit);
    items.forEach(item => {
      const effect = ITEM_SPECIAL_EFFECTS[item.id];
      if (effect?.onTurnStart) {
        effect.onTurnStart(unit, battle);
      }
    });
  }

  // Process turn end
  static processTurnEnd(unit: BattleUnit, battle: BattleState) {
    const items = this.getUnitItems(unit);
    items.forEach(item => {
      const effect = ITEM_SPECIAL_EFFECTS[item.id];
      if (effect?.onTurnEnd) {
        effect.onTurnEnd(unit, battle);
      }
    });
  }

  // Process unit death
  static processUnitDeath(unit: BattleUnit, killer: BattleUnit | null, battle: BattleState) {
    const items = this.getUnitItems(unit);
    items.forEach(item => {
      const effect = ITEM_SPECIAL_EFFECTS[item.id];
      if (effect?.onDeath) {
        effect.onDeath(unit, killer, battle);
      }
    });

    // Process killer's on-kill effects
    if (killer) {
      const killerItems = this.getUnitItems(killer);
      killerItems.forEach(item => {
        const effect = ITEM_SPECIAL_EFFECTS[item.id];
        if (effect?.onKill) {
          effect.onKill(killer, unit, battle);
        }
      });
    }
  }

  // Helper to get unit's equipped items
  private static getUnitItems(unit: BattleUnit): ItemInstance[] {
    // This will be connected to the actual inventory system
    // For now, return empty array
    return unit.equippedItems || [];
  }
}