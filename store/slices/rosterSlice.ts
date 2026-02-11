import type { StoreSet, StoreGet } from '../storeTypes';
import { Hero } from '@/types/core.types';
import { ScreenType } from '@/types/progression.types';
import { createHeroInstance, getHeroGemCost, LEARNABLE_ABILITIES, HERO_LEARNABLE_ABILITIES, HERO_TEMPLATES } from '@/data/units';

// Create starter heroes - IMPROVED EARLY GAME WITH 3 HEROES
// Provides basic team composition: Tank, DPS, Support
const starterHeroes = [
  createHeroInstance('quester', 1),      // Versatile fighter with learnable abilities
  createHeroInstance('blood_knight', 1), // Tank with lifesteal
  createHeroInstance('witch_hunter', 1), // Ranged DPS
];

export const rosterInitialState = {
  roster: starterHeroes as Hero[],
  abilitySelectionHeroId: null as string | null,
  levelUpHeroId: null as string | null,
  levelUpQueue: [] as string[], // Queue of heroes that need to make level up choices
  unlockedHeroIds: new Set<string>(['quester', 'blood_knight', 'witch_hunter']), // Starter heroes unlocked
};

export function createRosterSlice(set: StoreSet, get: StoreGet) {
  return {
    ...rosterInitialState,

    // Roster management
    addHero: (hero: Hero) => {
      set((state) => ({
        roster: [...state.roster, hero],
      }));
      // Recalculate stats for the new hero to ensure level bonuses are applied
      const state = get();
      state.recalculateHeroStatsWithLevel(hero.instanceId);
    },

    removeHero: (heroInstanceId: string) =>
      set((state) => ({
        roster: state.roster.filter((h) => h.instanceId !== heroInstanceId),
        selectedTeam: state.selectedTeam.filter((id) => id !== heroInstanceId),
      })),

    updateHero: (heroInstanceId: string, updates: Partial<Hero>) =>
      set((state) => ({
        roster: state.roster.map((h) =>
          h.instanceId === heroInstanceId ? { ...h, ...updates } : h
        ),
      })),

    awardHeroExperience: (heroInstanceId: string, amount: number) => {
      const state = get();
      const hero = state.roster.find(h => h.instanceId === heroInstanceId);
      if (!hero) return;

      const originalLevel = hero.level;
      const hadNoAbilities = hero.abilities.length === 0;
      let newExp = hero.experience + amount;
      let newLevel = hero.level;
      let maxExp = hero.maxExperience;
      let didLevelUp = false;

      // Level up logic - loop in case hero levels up multiple times
      while (newExp >= maxExp) {
        newExp -= maxExp;
        newLevel++;
        maxExp = Math.floor(100 * Math.pow(1.5, newLevel - 1));
        didLevelUp = true;
      }

      // Update hero with new level and experience
      state.updateHero(heroInstanceId, {
        experience: newExp,
        level: newLevel,
        maxExperience: maxExp,
      });

      // Recalculate stats if level changed
      if (newLevel !== originalLevel) {
        state.recalculateHeroStatsWithLevel(heroInstanceId);
      }

      // Check if hero leveled up and needs to make a choice
      if (didLevelUp) {
        // Add the hero to level up queue
        state.addToLevelUpQueue(heroInstanceId);
      }
    },

    recalculateHeroStatsWithLevel: (heroInstanceId: string) => {
      const state = get();
      const hero = state.roster.find(h => h.instanceId === heroInstanceId);
      if (!hero) return;

      // Start with base stats and apply level-based growth
      let newStats = { ...hero.baseStats };

      // Apply stat growth for each level above 1
      const levelsGained = hero.level - 1;
      if (levelsGained > 0 && hero.statGrowth) {
        newStats.hp += hero.statGrowth.hp * levelsGained;
        newStats.maxHp += hero.statGrowth.hp * levelsGained;
        newStats.damage += hero.statGrowth.damage * levelsGained;
        newStats.speed += hero.statGrowth.speed * levelsGained;
        newStats.defense += hero.statGrowth.defense * levelsGained;
        newStats.critChance += hero.statGrowth.critChance * levelsGained;
        newStats.critDamage += hero.statGrowth.critDamage * levelsGained;
        newStats.evasion += hero.statGrowth.evasion * levelsGained;
        newStats.accuracy += hero.statGrowth.accuracy * levelsGained;

        if (hero.statGrowth.penetration) {
          newStats.penetration = (newStats.penetration || 0) + hero.statGrowth.penetration * levelsGained;
        }
        if (hero.statGrowth.lifesteal) {
          newStats.lifesteal = (newStats.lifesteal || 0) + hero.statGrowth.lifesteal * levelsGained;
        }
      }

      // Apply equipped item effects on top of level-based stats
      if (hero.equippedItem) {
        const item = state.inventory.find(i => i.instanceId === hero.equippedItem);
        if (item) {
          item.effects.forEach(effect => {
            const currentValue = (newStats as any)[effect.stat] as number;
            if (effect.type === 'add') {
              (newStats as any)[effect.stat] = currentValue + effect.value;
            } else if (effect.type === 'multiply') {
              (newStats as any)[effect.stat] = currentValue * effect.value;
            }
          });
        }
      }

      // Update hero with new stats
      state.updateHero(heroInstanceId, { currentStats: newStats });
    },

    // Ability selection
    setAbilitySelectionHero: (heroId: string | null) => {
      set({ abilitySelectionHeroId: heroId });

      // Navigate to ability selection screen if heroId is provided
      if (heroId) {
        // IMPORTANT: Clear battle state and reset speed immediately
        // This prevents any auto-advance logic from interfering
        set({
          currentBattle: null,
          battleEventIndex: 0,
          battleSpeed: 1, // Reset speed to 1x for ability selection
        });

        const state = get();
        state.navigate(ScreenType.AbilitySelection);
      }
    },

    learnAbility: (heroInstanceId: string, abilityId: string) => {
      const state = get();
      const hero = state.roster.find(h => h.instanceId === heroInstanceId);

      if (!hero) {
        return;
      }

      // Check if ability exists in learnable abilities
      const ability = LEARNABLE_ABILITIES[abilityId];
      if (!ability) {
        return;
      }

      // Check if hero can learn this ability
      const learnableAbilities = HERO_LEARNABLE_ABILITIES[hero.id];
      if (!learnableAbilities || !learnableAbilities.includes(abilityId)) {
        return;
      }

      // Add ability to hero's abilities array
      // Deep copy the ability to ensure all properties (including range) are copied
      const copiedAbility = {
        id: ability.id,
        name: ability.name,
        type: ability.type,
        description: ability.description,
        cooldown: ability.cooldown,
        currentCooldown: ability.currentCooldown,
        range: ability.range, // Explicitly copy range
        effects: ability.effects.map(e => ({ ...e })), // Deep copy effects
        animationType: ability.animationType,
      };
      const updatedAbilities = [...hero.abilities, copiedAbility];
      state.updateHero(heroInstanceId, { abilities: updatedAbilities });

      // Clear ability selection state
      set({ abilitySelectionHeroId: null });

      // Get fresh state after updates to ensure we use the updated roster
      const freshState = get();

      // Navigate back to PreBattle screen if we have a selectedStageId, otherwise go to LocationMap
      if (freshState.selectedStageId) {
        freshState.navigate(ScreenType.PreBattle);
      } else {
        freshState.navigate(ScreenType.LocationMap);
      }
    },

    // Level up choice system
    setLevelUpHero: (heroId: string | null) => {
      set({ levelUpHeroId: heroId });

      // Navigate to level up choice screen if heroId is provided
      if (heroId) {
        const state = get();
        state.navigate(ScreenType.LevelUpChoice);
      }
    },

    addToLevelUpQueue: (heroId: string) => {
      set((state) => {
        // Only add if not already in queue
        if (!state.levelUpQueue.includes(heroId)) {
          return { levelUpQueue: [...state.levelUpQueue, heroId] };
        }
        return state;
      });
    },

    processNextLevelUp: () => {
      const state = get();
      if (state.levelUpQueue.length > 0) {
        const nextHeroId = state.levelUpQueue[0];

        // Remove from queue and set as current level up hero
        set((s) => ({
          levelUpQueue: s.levelUpQueue.slice(1),
          levelUpHeroId: nextHeroId
        }));

        // Use fresh state after the set operation
        setTimeout(() => {
          const freshState = get();
          freshState.navigate(ScreenType.LevelUpChoice);
        }, 0);
      } else {
        // No more heroes to level up, return to location map
        state.navigate(ScreenType.LocationMap);
      }
    },

    applyLevelUpChoice: (heroId: string, choiceType: 'stat' | 'ability', data: any) => {
      const state = get();
      const hero = state.roster.find(h => h.instanceId === heroId);

      if (!hero) {
        return;
      }

      if (choiceType === 'stat') {
        // Apply stat bonuses
        const statBonus = data as {
          hp?: number;
          damage?: number;
          defense?: number;
          speed?: number;
          critChance?: number;
          critDamage?: number;
        };

        const updatedStats = { ...hero.currentStats };
        const updatedBaseStats = { ...hero.baseStats };

        if (statBonus.hp) {
          updatedStats.hp += statBonus.hp;
          updatedStats.maxHp += statBonus.hp;
          updatedBaseStats.hp += statBonus.hp;
          updatedBaseStats.maxHp += statBonus.hp;
        }
        if (statBonus.damage) {
          updatedStats.damage += statBonus.damage;
          updatedBaseStats.damage += statBonus.damage;
        }
        if (statBonus.defense) {
          updatedStats.defense += statBonus.defense;
          updatedBaseStats.defense += statBonus.defense;
        }
        if (statBonus.speed) {
          updatedStats.speed += statBonus.speed;
          updatedBaseStats.speed += statBonus.speed;
        }
        if (statBonus.critChance) {
          updatedStats.critChance = Math.min(1, updatedStats.critChance + statBonus.critChance);
          updatedBaseStats.critChance = Math.min(1, updatedBaseStats.critChance + statBonus.critChance);
        }
        if (statBonus.critDamage) {
          updatedStats.critDamage += statBonus.critDamage;
          updatedBaseStats.critDamage += statBonus.critDamage;
        }

        state.updateHero(heroId, {
          currentStats: updatedStats,
          baseStats: updatedBaseStats
        });

      } else if (choiceType === 'ability') {
        // Learn the chosen ability
        const abilityId = data.abilityId;
        if (abilityId) {
          state.learnAbility(heroId, abilityId);
        }
      }

      // Clear level up state
      set({ levelUpHeroId: null });
    },

    // Hero unlock system
    unlockHero: (heroId: string) => {
      const state = get();
      const template = HERO_TEMPLATES[heroId];

      if (!template) {
        return false;
      }

      const cost = getHeroGemCost(template.rarity);

      // Check if player has enough gems
      if (!state.spendGems(cost)) {
        return false;
      }

      // Add to unlocked heroes
      const newUnlocked = new Set(state.unlockedHeroIds);
      newUnlocked.add(heroId);
      set({ unlockedHeroIds: newUnlocked });

      // Create hero instance and add to roster
      const newHero = createHeroInstance(heroId, 1) as Hero;
      state.addHero(newHero);

      return true;
    },
  };
}
