import type { StoreSet, StoreGet } from '../storeTypes';
import { Hero, Item, ItemInstance } from '@/types/core.types';
import { ScreenType } from '@/types/progression.types';

export const inventoryInitialState = {
  inventory: [] as ItemInstance[],
};

export function createInventorySlice(set: StoreSet, get: StoreGet) {
  const actions = {
    addItem: (item: Item) => {
      const itemInstance: ItemInstance = {
        ...item,
        instanceId: `${item.id}_${Date.now()}_${Math.random()}`,
        equippedTo: undefined,
        durability: item.maxDurability, // Initialize durability to max if item has durability
      };
      set((state) => ({
        inventory: [...state.inventory, itemInstance],
      }));
    },

    removeItem: (itemInstanceId: string) =>
      set((state) => ({
        inventory: state.inventory.filter((i) => i.instanceId !== itemInstanceId),
      })),

    equipItem: (itemInstanceId: string, heroInstanceId: string) => {
      const state = get();
      const item = state.inventory.find(i => i.instanceId === itemInstanceId);
      const hero = state.roster.find(h => h.instanceId === heroInstanceId);

      if (!item || !hero) {
        return false;
      }

      // Check if item is already equipped to someone else
      if (item.equippedTo && item.equippedTo !== heroInstanceId) {
        state.unequipItem(itemInstanceId);
      }

      // Check if hero already has an item equipped
      if (hero.equippedItem && hero.equippedItem !== itemInstanceId) {
        // Unequip current item first
        state.unequipItem(hero.equippedItem);
      }

      // Equip new item
      set((state) => ({
        inventory: state.inventory.map(i =>
          i.instanceId === itemInstanceId
            ? { ...i, equippedTo: heroInstanceId }
            : i
        ),
        roster: state.roster.map(h =>
          h.instanceId === heroInstanceId
            ? { ...h, equippedItem: itemInstanceId }
            : h
        ),
      }));

      // Recalculate hero stats with new item
      state.recalculateHeroStats(heroInstanceId);

      // Refresh the screen to show updated equipment
      const currentState = get();
      if (currentState.currentScreen === ScreenType.BattleInventory) {
        currentState.navigate(currentState.currentScreen);
      }

      // If item is consumable, remove it from inventory after equipping
      if (item.consumable) {
        setTimeout(() => {
          state.removeItem(itemInstanceId);
        }, 100);
      }

      return true;
    },

    sellItem: (itemInstanceId: string) => {
      const state = get();
      const item = state.inventory.find(i => i.instanceId === itemInstanceId);

      if (!item || item.equippedTo) {
        // Can't sell equipped items
        return false;
      }

      // Calculate sell price based on rarity
      const sellPrices: Record<string, number> = {
        common: 25,
        uncommon: 50,
        rare: 100,
        epic: 200,
        legendary: 400,
        mythic: 800,
      };

      const sellPrice = sellPrices[item.rarity] || 25;

      // Add gold and remove item
      set((state) => ({
        player: {
          ...state.player,
          gold: state.player.gold + sellPrice,
        },
        inventory: state.inventory.filter(i => i.instanceId !== itemInstanceId),
      }));

      return true;
    },

    useConsumable: (itemInstanceId: string, heroInstanceId: string) => {
      const state = get();
      const item = state.inventory.find(i => i.instanceId === itemInstanceId);
      const hero = state.roster.find(h => h.instanceId === heroInstanceId);

      if (!item || !hero) {
        return false;
      }

      // Check if item is consumable - items already have all the data, don't need to look up in ITEM_TEMPLATES
      if (item.type !== 'consumable' && (item.category as any) !== 4) {
        return false;
      }

      // Apply consumable effect based on item id
      let effectApplied = false;
      const itemId = item.id;
      const heroAny = hero as any; // Runtime properties (statusEffects, tempBuffs, regenEffect) not in Hero type

      switch (itemId) {
        case 'health_potion_small':
          hero.currentStats.hp = Math.min(hero.currentStats.hp + 50, hero.currentStats.maxHp);
          effectApplied = true;
          break;

        case 'health_potion_medium':
          hero.currentStats.hp = Math.min(hero.currentStats.hp + 100, hero.currentStats.maxHp);
          effectApplied = true;
          break;

        case 'health_potion_large':
          hero.currentStats.hp = Math.min(hero.currentStats.hp + 200, hero.currentStats.maxHp);
          effectApplied = true;
          break;

        case 'mana_potion_small':
          // Reduce ability cooldowns by 50%
          if (hero.abilities) {
            hero.abilities.forEach(ability => {
              if (ability.currentCooldown) {
                ability.currentCooldown = Math.floor(ability.currentCooldown * 0.5);
              }
            });
          }
          effectApplied = true;
          break;

        case 'antidote':
          // Remove poison/debuff effects
          if (heroAny.statusEffects) {
            heroAny.statusEffects = heroAny.statusEffects.filter(
              (effect: any) => effect.type !== 'poison' && effect.type !== 'debuff'
            );
          }
          effectApplied = true;
          break;

        case 'strength_potion':
          // Temporary 50% attack boost for next battle
          heroAny.tempBuffs = heroAny.tempBuffs || [];
          heroAny.tempBuffs.push({ stat: 'attack', value: 0.50, duration: 1 });
          effectApplied = true;
          break;

        case 'speed_potion':
          // Temporary 30% speed boost for next battle
          heroAny.tempBuffs = heroAny.tempBuffs || [];
          heroAny.tempBuffs.push({ stat: 'speed', value: 0.30, duration: 1 });
          effectApplied = true;
          break;

        case 'defense_potion':
          // Temporary +20 defense for next battle
          heroAny.tempBuffs = heroAny.tempBuffs || [];
          heroAny.tempBuffs.push({ stat: 'defense', value: 20, duration: 1, absolute: true });
          effectApplied = true;
          break;

        case 'regeneration_potion':
          // Heal 20 HP per second during next wave
          heroAny.regenEffect = { healPerSecond: 20, duration: 'nextWave' };
          effectApplied = true;
          break;

        case 'berserker_elixir':
          // Double damage but halve defense for next battle
          heroAny.tempBuffs = heroAny.tempBuffs || [];
          heroAny.tempBuffs.push({ stat: 'damage', value: 1.0, duration: 1 });
          heroAny.tempBuffs.push({ stat: 'defense', value: -0.50, duration: 1 });
          effectApplied = true;
          break;

        case 'invisibility_potion':
          // Cannot be targeted for first 5 seconds
          heroAny.invisibilityDuration = 5;
          effectApplied = true;
          break;

        case 'cleansing_elixir':
          // Remove all debuffs and grant immunity
          if (heroAny.statusEffects) {
            heroAny.statusEffects = heroAny.statusEffects.filter((effect: any) => effect.type === 'buff');
          }
          heroAny.debuffImmunity = { duration: 3 };
          effectApplied = true;
          break;

        case 'full_restore':
          // Full HP
          hero.currentStats.hp = hero.currentStats.maxHp;
          effectApplied = true;
          break;

        case 'group_heal_elixir':
          // Heal all heroes for 150 HP
          state.roster.forEach(h => {
            if (h.currentStats.hp > 0) {
              h.currentStats.hp = Math.min(h.currentStats.hp + 150, h.currentStats.maxHp);
            }
          });
          effectApplied = true;
          break;

        case 'titan_brew':
          // +25% all stats for next battle
          heroAny.tempBuffs = heroAny.tempBuffs || [];
          heroAny.tempBuffs.push({ stat: 'damage', value: 0.25, duration: 1 });
          heroAny.tempBuffs.push({ stat: 'defense', value: 0.25, duration: 1 });
          heroAny.tempBuffs.push({ stat: 'speed', value: 0.25, duration: 1 });
          heroAny.tempBuffs.push({ stat: 'hp', value: 0.25, duration: 1 });
          effectApplied = true;
          break;

        case 'chrono_elixir':
          // Reset all ability cooldowns
          if (hero.abilities) {
            hero.abilities.forEach(ability => {
              ability.currentCooldown = 0;
            });
          }
          effectApplied = true;
          break;

        case 'phoenix_tears':
          // Resurrect if dead or heal to full if alive
          if (hero.currentStats.hp <= 0 || heroAny.isDefeated) {
            hero.currentStats.hp = hero.currentStats.maxHp;
            heroAny.isDefeated = false;
          } else {
            hero.currentStats.hp = hero.currentStats.maxHp;
          }
          effectApplied = true;
          break;

        case 'divine_protection':
          // Invulnerable for next wave
          heroAny.invulnerableForWave = true;
          effectApplied = true;
          break;

        case 'miracle_elixir':
          // Fully heal all heroes and reset all cooldowns
          state.roster.forEach(h => {
            h.currentStats.hp = h.currentStats.maxHp;
            if (h.abilities) {
              h.abilities.forEach(ability => {
                ability.currentCooldown = 0;
              });
            }
          });
          effectApplied = true;
          break;

        default:
          // Try to apply basic healing if it has HP effect
          if (item.effects && item.effects.length > 0) {
            const hpEffect = item.effects.find(e => e.stat === 'hp');
            if (hpEffect && hpEffect.type === 'add') {
              hero.currentStats.hp = Math.min(hero.currentStats.hp + hpEffect.value, hero.currentStats.maxHp);
              effectApplied = true;
            }
          }
          break;
      }

      if (effectApplied) {
        // Remove consumable from inventory and update roster
        set((state) => {
          const updatedState: any = {
            inventory: state.inventory.filter(i => i.instanceId !== itemInstanceId),
            roster: state.roster // Update roster with modified heroes
          };

          // If in battle, also update the battle state
          if (state.currentBattle) {
            const battleHero = state.currentBattle.heroes.find(h => h.instanceId === heroInstanceId);
            if (battleHero) {
              // Update the battle hero's HP to match what we just set
              battleHero.stats.hp = hero.currentStats.hp;
              battleHero.stats.maxHp = hero.currentStats.maxHp;
            }
            updatedState.currentBattle = state.currentBattle;
          }

          return updatedState;
        });

        // Refresh the screen to show updated HP
        const currentState = get();
        currentState.navigate(currentState.currentScreen);

        return true;
      }

      return false;
    },

    unequipItem: (itemInstanceId: string) => {
      const state = get();
      const item = state.inventory.find(i => i.instanceId === itemInstanceId);
      if (!item || !item.equippedTo) return;

      const heroId = item.equippedTo;

      set((state) => ({
        inventory: state.inventory.map(i =>
          i.instanceId === itemInstanceId
            ? { ...i, equippedTo: undefined }
            : i
        ),
        roster: state.roster.map(h =>
          h.instanceId === heroId
            ? { ...h, equippedItem: undefined }
            : h
        ),
      }));

      // Recalculate hero stats without item
      state.recalculateHeroStats(heroId);
    },

    recalculateHeroStats: (heroInstanceId: string) => {
      const state = get();
      // Use the level-aware recalculation function
      state.recalculateHeroStatsWithLevel(heroInstanceId);
    },
  };

  return { ...inventoryInitialState, ...actions };
}
