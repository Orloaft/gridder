// Consumable item definitions based on Item System Design Document
import { Item, ItemInstance, Rarity, ItemCategory } from '@/types/core.types';
import { ICON_PATHS } from '@/utils/iconPaths';

// Consumable effect function type
export type ConsumableEffect = (
  heroId: string,
  battleState: any // Will be BattleState type
) => void;

// Extended consumable item interface
export interface ConsumableItem extends Item {
  consumable: true;
  cooldown?: 'once_per_combat' | 'once_per_mission';
  effect: ConsumableEffect;
  aiUsageConditions?: {
    type: 'hp_threshold' | 'mana_threshold' | 'enemy_count' | 'wave_number' | 'ally_fainted' | 'boss_fight';
    value: number | boolean;
    comparison: '<' | '>' | '==' | '>=';
  }[];
  aiPriority: number; // 1 (highest) to 10 (lowest)
}

export const CONSUMABLE_TEMPLATES: Record<string, ConsumableItem> = {
  // ===========================================
  // POTIONS
  // ===========================================

  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Restore 50% max HP instantly',
    rarity: Rarity.Common,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.potion,
    spritePath: ICON_PATHS.potion,
    cost: 50,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1, // Single use
    aiPriority: 3,
    aiUsageConditions: [
      { type: 'hp_threshold', value: 40, comparison: '<' }
    ],
    effect: (heroId, battleState) => {
      const hero = battleState.heroes.find((h: any) => h.instanceId === heroId);
      if (hero) {
        const healAmount = Math.floor(hero.maxHp * 0.5);
        hero.currentHp = Math.min(hero.maxHp, hero.currentHp + healAmount);
        battleState.addEvent({
          type: 'heal',
          data: { targetId: heroId, amount: healAmount, source: 'Health Potion' }
        });
      }
    }
  },

  mana_potion: {
    id: 'mana_potion',
    name: 'Mana Potion',
    description: 'Restore 100% max mana instantly',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.potion,
    spritePath: ICON_PATHS.potion,
    cost: 100,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 5,
    aiUsageConditions: [
      { type: 'mana_threshold', value: 30, comparison: '<' }
    ],
    effect: (heroId, battleState) => {
      const hero = battleState.heroes.find((h: any) => h.instanceId === heroId);
      if (hero && hero.mana !== undefined) {
        hero.currentMana = hero.maxMana;
        battleState.addEvent({
          type: 'manaRestore',
          data: { targetId: heroId, amount: hero.maxMana, source: 'Mana Potion' }
        });
      }
    }
  },

  elixir_of_strength: {
    id: 'elixir_of_strength',
    name: 'Elixir of Strength',
    description: '+50% damage for 10 seconds',
    rarity: Rarity.Rare,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.potion,
    spritePath: ICON_PATHS.potion,
    cost: 300,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 4,
    aiUsageConditions: [
      { type: 'boss_fight', value: true, comparison: '==' },
      { type: 'wave_number', value: 8, comparison: '>=' }
    ],
    effect: (heroId, battleState) => {
      const hero = battleState.heroes.find((h: any) => h.instanceId === heroId);
      if (hero) {
        // Apply damage buff for 10 seconds (10 combat ticks)
        hero.buffs = hero.buffs || [];
        hero.buffs.push({
          type: 'damage_boost',
          value: 1.5,
          duration: 10,
          source: 'Elixir of Strength'
        });
        battleState.addEvent({
          type: 'buff',
          data: { targetId: heroId, buffType: 'damage_boost', duration: 10 }
        });
      }
    }
  },

  potion_of_invulnerability: {
    id: 'potion_of_invulnerability',
    name: 'Potion of Invulnerability',
    description: 'Immune to all damage for 5 seconds',
    rarity: Rarity.Legendary,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.potion,
    spritePath: ICON_PATHS.potion,
    cost: 1000,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 2,
    aiUsageConditions: [
      { type: 'hp_threshold', value: 20, comparison: '<' }
    ],
    effect: (heroId, battleState) => {
      const hero = battleState.heroes.find((h: any) => h.instanceId === heroId);
      if (hero) {
        hero.buffs = hero.buffs || [];
        hero.buffs.push({
          type: 'invulnerable',
          duration: 5,
          source: 'Potion of Invulnerability'
        });
        battleState.addEvent({
          type: 'buff',
          data: { targetId: heroId, buffType: 'invulnerable', duration: 5 }
        });
      }
    }
  },

  // ===========================================
  // SCROLLS
  // ===========================================

  scroll_of_teleportation: {
    id: 'scroll_of_teleportation',
    name: 'Scroll of Teleportation',
    description: 'Teleport to any visible tile instantly',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.scroll,
    spritePath: ICON_PATHS.scroll,
    cost: 150,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 8,
    aiUsageConditions: [
      { type: 'enemy_count', value: 3, comparison: '>=' }
    ],
    effect: (heroId, battleState) => {
      const hero = battleState.heroes.find((h: any) => h.instanceId === heroId);
      if (hero) {
        // Find safe position (far from enemies)
        const enemies = battleState.enemies.filter((e: any) => e.isAlive);
        let bestPos = hero.position;
        let maxDistance = 0;

        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 4; col++) { // Hero side only
            const pos = { row, col };
            if (battleState.isTileOccupied(pos)) continue;

            const minEnemyDist = Math.min(...enemies.map((e: any) =>
              Math.abs(e.position.row - row) + Math.abs(e.position.col - col)
            ));

            if (minEnemyDist > maxDistance) {
              maxDistance = minEnemyDist;
              bestPos = pos;
            }
          }
        }

        hero.position = bestPos;
        battleState.addEvent({
          type: 'teleport',
          data: { unitId: heroId, to: bestPos }
        });
      }
    }
  },

  scroll_of_fireball: {
    id: 'scroll_of_fireball',
    name: 'Scroll of Fireball',
    description: 'Deal 100 damage in 3-tile radius',
    rarity: Rarity.Rare,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.scroll,
    spritePath: ICON_PATHS.scroll,
    cost: 250,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 6,
    aiUsageConditions: [
      { type: 'enemy_count', value: 3, comparison: '>=' }
    ],
    effect: (heroId, battleState) => {
      // Find cluster of enemies
      const enemies = battleState.enemies.filter((e: any) => e.isAlive);
      let bestTarget = null;
      let maxTargets = 0;

      enemies.forEach((enemy: any) => {
        const targetsInRange = enemies.filter((e: any) => {
          const dist = Math.max(
            Math.abs(e.position.row - enemy.position.row),
            Math.abs(e.position.col - enemy.position.col)
          );
          return dist <= 1; // 3x3 area
        }).length;

        if (targetsInRange > maxTargets) {
          maxTargets = targetsInRange;
          bestTarget = enemy;
        }
      });

      if (bestTarget) {
        // Deal damage to all enemies in area
        enemies.forEach((enemy: any) => {
          const dist = Math.max(
            Math.abs(enemy.position.row - bestTarget.position.row),
            Math.abs(enemy.position.col - bestTarget.position.col)
          );
          if (dist <= 1) {
            enemy.currentHp = Math.max(0, enemy.currentHp - 100);
            battleState.addEvent({
              type: 'damage',
              data: {
                targetId: enemy.instanceId,
                amount: 100,
                source: 'Scroll of Fireball',
                damageType: 'magic'
              }
            });
          }
        });
      }
    }
  },

  scroll_of_resurrection: {
    id: 'scroll_of_resurrection',
    name: 'Scroll of Resurrection',
    description: 'Revive fainted ally at 50% HP',
    rarity: Rarity.Legendary,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.scroll,
    spritePath: ICON_PATHS.scroll,
    cost: 500,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_mission',
    maxDurability: 1,
    aiPriority: 1,
    aiUsageConditions: [
      { type: 'ally_fainted', value: true, comparison: '==' }
    ],
    effect: (heroId, battleState) => {
      const faintedHero = battleState.heroes.find((h: any) => !h.isAlive);
      if (faintedHero) {
        faintedHero.isAlive = true;
        faintedHero.currentHp = Math.floor(faintedHero.maxHp * 0.5);
        battleState.addEvent({
          type: 'resurrect',
          data: { targetId: faintedHero.instanceId, hp: faintedHero.currentHp }
        });
      }
    }
  },

  // ===========================================
  // GRENADES/BOMBS
  // ===========================================

  smoke_bomb: {
    id: 'smoke_bomb',
    name: 'Smoke Bomb',
    description: 'Create smoke cloud (3×3 area) granting invisibility for 3 seconds',
    rarity: Rarity.Common,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.bomb,
    spritePath: ICON_PATHS.bomb,
    cost: 75,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 8,
    aiUsageConditions: [
      { type: 'hp_threshold', value: 30, comparison: '<' },
      { type: 'enemy_count', value: 3, comparison: '>=' }
    ],
    effect: (heroId, battleState) => {
      const hero = battleState.heroes.find((h: any) => h.instanceId === heroId);
      if (hero) {
        // Apply invisibility to hero and nearby allies
        battleState.heroes.forEach((ally: any) => {
          const dist = Math.max(
            Math.abs(ally.position.row - hero.position.row),
            Math.abs(ally.position.col - hero.position.col)
          );
          if (dist <= 1 && ally.isAlive) { // 3x3 area
            ally.buffs = ally.buffs || [];
            ally.buffs.push({
              type: 'invisible',
              duration: 3,
              source: 'Smoke Bomb'
            });
            battleState.addEvent({
              type: 'buff',
              data: { targetId: ally.instanceId, buffType: 'invisible', duration: 3 }
            });
          }
        });
      }
    }
  },

  fire_bomb: {
    id: 'fire_bomb',
    name: 'Fire Bomb',
    description: 'Deal 50 damage in 2-tile radius, apply burning (5 damage/sec for 5 seconds)',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.bomb,
    spritePath: ICON_PATHS.bomb,
    cost: 125,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 7,
    aiUsageConditions: [
      { type: 'enemy_count', value: 2, comparison: '>=' }
    ],
    effect: (heroId, battleState) => {
      // Find best target cluster
      const enemies = battleState.enemies.filter((e: any) => e.isAlive);
      let bestTarget = enemies[0];
      let maxTargets = 0;

      enemies.forEach((enemy: any) => {
        const targetsInRange = enemies.filter((e: any) => {
          const dist = Math.abs(e.position.row - enemy.position.row) +
                      Math.abs(e.position.col - enemy.position.col);
          return dist <= 2;
        }).length;

        if (targetsInRange > maxTargets) {
          maxTargets = targetsInRange;
          bestTarget = enemy;
        }
      });

      if (bestTarget) {
        enemies.forEach((enemy: any) => {
          const dist = Math.abs(enemy.position.row - bestTarget.position.row) +
                      Math.abs(enemy.position.col - bestTarget.position.col);
          if (dist <= 2) {
            enemy.currentHp = Math.max(0, enemy.currentHp - 50);
            enemy.debuffs = enemy.debuffs || [];
            enemy.debuffs.push({
              type: 'burning',
              damage: 5,
              duration: 5,
              source: 'Fire Bomb'
            });
            battleState.addEvent({
              type: 'damage',
              data: {
                targetId: enemy.instanceId,
                amount: 50,
                source: 'Fire Bomb',
                statusApplied: 'burning'
              }
            });
          }
        });
      }
    }
  },

  frost_bomb: {
    id: 'frost_bomb',
    name: 'Frost Bomb',
    description: 'Deal 40 damage in 3-tile radius, slow by 80% for 4 seconds',
    rarity: Rarity.Rare,
    category: ItemCategory.Consumable,
    effects: [],
    icon: ICON_PATHS.bomb,
    spritePath: ICON_PATHS.bomb,
    cost: 200,
    slot: 'accessory',
    consumable: true,
    cooldown: 'once_per_combat',
    maxDurability: 1,
    aiPriority: 7,
    aiUsageConditions: [
      { type: 'enemy_count', value: 2, comparison: '>=' }
    ],
    effect: (heroId, battleState) => {
      const enemies = battleState.enemies.filter((e: any) => e.isAlive);
      let bestTarget = enemies[0];

      // Target fastest enemy cluster
      enemies.sort((a: any, b: any) => b.speed - a.speed);
      bestTarget = enemies[0];

      if (bestTarget) {
        enemies.forEach((enemy: any) => {
          const dist = Math.max(
            Math.abs(enemy.position.row - bestTarget.position.row),
            Math.abs(enemy.position.col - bestTarget.position.col)
          );
          if (dist <= 1) { // 3x3 area
            enemy.currentHp = Math.max(0, enemy.currentHp - 40);
            enemy.debuffs = enemy.debuffs || [];
            enemy.debuffs.push({
              type: 'slow',
              value: 0.2, // 80% slow = 20% speed
              duration: 4,
              source: 'Frost Bomb'
            });
            battleState.addEvent({
              type: 'damage',
              data: {
                targetId: enemy.instanceId,
                amount: 40,
                source: 'Frost Bomb',
                statusApplied: 'slow'
              }
            });
          }
        });
      }
    }
  }
};

// Helper function to create consumable instance
export function createConsumableInstance(templateId: string): ItemInstance | null {
  const template = CONSUMABLE_TEMPLATES[templateId];
  if (!template) return null;

  return {
    ...template,
    instanceId: `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    durability: template.maxDurability
  };
}

// Get all consumable IDs by rarity
export function getConsumablesByRarity(rarity: Rarity): string[] {
  return Object.keys(CONSUMABLE_TEMPLATES).filter(
    id => CONSUMABLE_TEMPLATES[id].rarity === rarity
  );
}