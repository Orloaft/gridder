import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, ScreenType, PlayerData, CampaignProgress } from '@/types/progression.types';
import { Hero, Item, ItemInstance } from '@/types/core.types';
import { AnyGridOccupant } from '@/types/grid.types';
import { createMainMenuLayout } from '@/screens/MainMenu/MainMenuLayout';
import { createLocationMapLayout } from '@/screens/LocationMap/LocationMapLayout';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';
import { createPreBattleLayout } from '@/screens/PreBattle/PreBattleLayout';
import { createBattleLayout } from '@/screens/Battle/BattleLayout';
import { createHeroRosterLayout } from '@/screens/HeroRoster/HeroRosterLayout';
import { createShopLayout } from '@/screens/Shop/ShopLayout';
import { createAbilitySelectionLayout } from '@/screens/AbilitySelection/AbilitySelectionLayout';
import { createHeroInstance, createEnemyInstance, getHeroGemCost, LEARNABLE_ABILITIES, HERO_LEARNABLE_ABILITIES } from '@/data/units';
import { getStageById, getNextUnlockedStage } from '@/data/stages';
import { getLocationByStageId } from '@/data/locations';
import { BattleSimulator, BattleState } from '@/systems/BattleSimulator';
import { audioManager } from '@/utils/audioManager';
import { getRandomItems, ITEM_TEMPLATES } from '@/data/items';
import { HERO_TEMPLATES } from '@/data/units';
import { Rarity } from '@/types/core.types';

interface GameStore extends GameState {
  // Grid management
  gridOccupants: AnyGridOccupant[];
  updateGridOccupants: (occupants: AnyGridOccupant[]) => void;
  gridSize: { rows: number; cols: number };
  setGridSize: (rows: number, cols: number) => void;
  zoomLevel: number; // 1.0 = normal, 0.75 = 75%, 0.5 = 50%
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Navigation (now updates grid instead of changing screens, returns new occupant count)
  navigate: (screen: ScreenType) => number;

  // Campaign state
  selectedLocationId: string | null;
  setSelectedLocationId: (locationId: string | null) => void;
  selectedStageId: number | null;
  setSelectedStageId: (stageId: number | null) => void;

  // Pre-Battle state
  preBattleTeam: string[]; // Hero instance IDs for current battle
  setPreBattleTeam: (heroIds: string[]) => void;
  addHeroToPreBattle: (heroId: string) => void;
  removeHeroFromPreBattle: (heroId: string) => void;

  // Battle state
  currentBattle: BattleState | null;
  battleEventIndex: number;
  battleSpeed: number; // Speed multiplier (1 = normal, 4 = 4x speed, 8 = 8x speed)
  setBattleSpeed: (speed: number) => void;
  startBattle: () => void;
  advanceBattleEvent: () => void;

  // Player actions
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  addExperience: (amount: number) => void;

  // Roster management
  addHero: (hero: Hero) => void;
  removeHero: (heroInstanceId: string) => void;
  updateHero: (heroInstanceId: string, updates: Partial<Hero>) => void;
  awardHeroExperience: (heroInstanceId: string, amount: number) => void;
  recalculateHeroStatsWithLevel: (heroInstanceId: string) => void;

  // Ability selection
  abilitySelectionHeroId: string | null;
  setAbilitySelectionHero: (heroId: string | null) => void;
  learnAbility: (heroInstanceId: string, abilityId: string) => void;

  // Inventory management
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  equipItem: (itemInstanceId: string, heroInstanceId: string) => boolean;
  unequipItem: (itemInstanceId: string) => void;
  recalculateHeroStats: (heroInstanceId: string) => void;

  // Team selection
  setSelectedTeam: (heroInstanceIds: string[]) => void;
  addToTeam: (heroInstanceId: string) => void;
  removeFromTeam: (heroInstanceId: string) => void;

  // Campaign progression
  completeStage: (stageId: number) => void;
  unlockFeature: (featureName: string) => void;

  // Shop management
  shopItems: Item[];
  shopHeroes: Hero[];
  refreshShop: () => void;
  purchaseItem: (itemId: string) => boolean;
  purchaseHero: (heroId: string) => boolean;

  // Reset game
  resetGame: () => void;
}

const initialPlayerData: PlayerData = {
  gold: 500,
  gems: 0, // Start with 0 gems - only get gems from bosses
  level: 1,
  experience: 0,
  maxExperience: 100,
};

const initialCampaignProgress: CampaignProgress = {
  currentStage: 1,
  maxStageReached: 1,
  stagesCompleted: new Set<number>(),
};

// Create starter heroes - only 1 Quester to start
const starterHeroes = [
  createHeroInstance('quester', 1),
];

const initialState = {
  player: initialPlayerData,
  roster: starterHeroes as Hero[],
  inventory: [] as ItemInstance[],
  campaign: initialCampaignProgress,
  unlockedFeatures: new Set<string>(['mainMenu', 'locationMap']),
  currentScreen: ScreenType.MainMenu,
  selectedTeam: [] as string[],
  gridOccupants: [] as AnyGridOccupant[],
  gridSize: { rows: 8, cols: 8 },
  zoomLevel: 1.0,
  selectedLocationId: null as string | null,
  selectedStageId: null as number | null,
  preBattleTeam: [] as string[],
  currentBattle: null as BattleState | null,
  battleEventIndex: 0,
  battleSpeed: 1,
  shopItems: [] as Item[],
  shopHeroes: [] as Hero[],
  abilitySelectionHeroId: null as string | null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Grid management
      updateGridOccupants: (occupants: AnyGridOccupant[]) =>
        set({ gridOccupants: occupants }),

      setGridSize: (rows: number, cols: number) => {
        set({ gridSize: { rows, cols } });
      },

      setZoomLevel: (zoom: number) => {
        // Clamp zoom between 0.5 and 1.5
        const clampedZoom = Math.max(0.5, Math.min(1.5, zoom));
        set({ zoomLevel: clampedZoom });
      },

      zoomIn: () => {
        const state = get();
        const newZoom = Math.min(1.5, state.zoomLevel + 0.25);
        set({ zoomLevel: newZoom });
      },

      zoomOut: () => {
        const state = get();
        const newZoom = Math.max(0.5, state.zoomLevel - 0.25);
        set({ zoomLevel: newZoom });
      },

      resetZoom: () => {
        set({ zoomLevel: 1.0 });
      },

      // Navigation (updates grid occupants based on screen, returns new occupant count)
      navigate: (screen: ScreenType) => {
        const state = get();
        set({ currentScreen: screen });

        // Generate new grid occupants based on screen
        let newOccupants: AnyGridOccupant[] = [];

        if (screen === ScreenType.MainMenu) {
          newOccupants = createMainMenuLayout(
            state.player.gold,
            state.player.gems,
            state.player.level,
            state.navigate
          );
        } else if (screen === ScreenType.HeroRoster) {
          newOccupants = createHeroRosterLayout(
            state.roster,
            state.player.gold,
            state.player.gems,
            state.navigate
          );
        } else if (screen === ScreenType.LocationMap) {
          newOccupants = createLocationMapLayout(
            state.campaign.stagesCompleted,
            state.navigate,
            state.setSelectedLocationId,
            state.selectedLocationId
          );
        } else if (screen === ScreenType.CampaignMap) {
          newOccupants = createCampaignMapLayout(
            state.campaign.stagesCompleted,
            state.navigate,
            state.setSelectedStageId,
            state.selectedStageId,
            state.selectedLocationId
          );
        } else if (screen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Keep existing team from previous missions
            // Team will persist until player manually changes it
            const team = state.preBattleTeam;

            newOccupants = createPreBattleLayout(
              stage,
              state.player.gold,
              state.player.gems,
              team,
              state.roster,
              state.navigate,
              state.addHeroToPreBattle,
              state.removeHeroFromPreBattle,
              state.startBattle,
              state.setPreBattleTeam,
              state.equipItem
            );
          }
        } else if (screen === ScreenType.Battle && state.currentBattle) {
          newOccupants = createBattleLayout(
            state.currentBattle,
            state.battleEventIndex,
            state.advanceBattleEvent,
            state.battleSpeed,
            () => {
              // Cycle through 1x, 4x, and 8x speed
              const newSpeed = state.battleSpeed === 1 ? 4 : state.battleSpeed === 4 ? 8 : 1;
              state.setBattleSpeed(newSpeed);
            }
          );
        } else if (screen === ScreenType.Shop) {
          // Refresh shop items if empty
          if (state.shopItems.length === 0) {
            state.refreshShop();
          }

          newOccupants = createShopLayout(
            state.player.gold,
            state.player.gems,
            state.shopItems,
            state.shopHeroes,
            state.navigate,
            state.purchaseItem,
            state.purchaseHero,
            state.refreshShop
          );
        } else if (screen === ScreenType.AbilitySelection && state.abilitySelectionHeroId) {
          // Find the hero that needs to select an ability
          const hero = state.roster.find(h => h.instanceId === state.abilitySelectionHeroId);
          if (hero) {
            newOccupants = createAbilitySelectionLayout(
              hero,
              state.learnAbility
            );
          }
        }

        set({ gridOccupants: newOccupants });

        // Return the count of new occupants
        return newOccupants.length;
      },

      // Campaign state
      setSelectedLocationId: (locationId: string | null) => {
        set({ selectedLocationId: locationId });
      },

      setSelectedStageId: (stageId: number | null) => {
        const state = get();
        console.log('setSelectedStageId called with:', stageId);
        set({ selectedStageId: stageId });

        // Regenerate campaign map with new selected stage
        const newOccupants = createCampaignMapLayout(
          state.campaign.stagesCompleted,
          state.navigate,
          state.setSelectedStageId,
          stageId,
          state.selectedLocationId
        );

        set({ gridOccupants: newOccupants });
      },

      // Player actions
      addGold: (amount: number) =>
        set((state) => ({
          player: { ...state.player, gold: state.player.gold + amount },
        })),

      spendGold: (amount: number) => {
        const state = get();
        if (state.player.gold >= amount) {
          set({
            player: { ...state.player, gold: state.player.gold - amount },
          });
          return true;
        }
        return false;
      },

      addGems: (amount: number) =>
        set((state) => ({
          player: { ...state.player, gems: state.player.gems + amount },
        })),

      spendGems: (amount: number) => {
        const state = get();
        if (state.player.gems >= amount) {
          set({
            player: { ...state.player, gems: state.player.gems - amount },
          });
          return true;
        }
        return false;
      },

      addExperience: (amount: number) =>
        set((state) => {
          let newExp = state.player.experience + amount;
          let newLevel = state.player.level;
          let maxExp = state.player.maxExperience;

          // Level up logic
          while (newExp >= maxExp) {
            newExp -= maxExp;
            newLevel++;
            maxExp = Math.floor(maxExp * 1.5); // Exponential scaling
          }

          return {
            player: {
              ...state.player,
              experience: newExp,
              level: newLevel,
              maxExperience: maxExp,
            },
          };
        }),

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
          console.log(`${hero.name} leveled up to level ${newLevel}!`);
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

        // Check if hero needs to select an ability after leveling up
        // Use the stored state from before the update
        if (didLevelUp && hadNoAbilities && HERO_LEARNABLE_ABILITIES[hero.id]) {
          // Hero leveled up and has no abilities - trigger ability selection
          console.log(`${hero.name} can now learn an ability!`);
          state.setAbilitySelectionHero(heroInstanceId);
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
              const currentValue = newStats[effect.stat] as number;
              if (effect.type === 'add') {
                newStats[effect.stat] = (currentValue + effect.value) as any;
              } else if (effect.type === 'multiply') {
                newStats[effect.stat] = (currentValue * effect.value) as any;
              }
            });
          }
        }

        // Update hero with new stats
        state.updateHero(heroInstanceId, { currentStats: newStats });
      },

      // Inventory management
      addItem: (item: Item) => {
        const itemInstance: ItemInstance = {
          ...item,
          instanceId: `${item.id}_${Date.now()}_${Math.random()}`,
          equippedTo: undefined,
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

        if (!item || !hero) return false;

        // Check if hero already has an item equipped
        if (hero.equippedItem) {
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

        // If item is consumable, remove it from inventory after equipping
        if (item.consumable) {
          setTimeout(() => {
            state.removeItem(itemInstanceId);
          }, 100);
        }

        return true;
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

      // Ability selection
      setAbilitySelectionHero: (heroId: string | null) => {
        set({ abilitySelectionHeroId: heroId });

        // Navigate to ability selection screen if heroId is provided
        if (heroId) {
          // IMPORTANT: Clear battle state and set screen immediately
          // This prevents any auto-advance logic from interfering
          set({
            currentBattle: null,
            battleEventIndex: 0,
          });

          const state = get();
          state.navigate(ScreenType.AbilitySelection);
        }
      },

      learnAbility: (heroInstanceId: string, abilityId: string) => {
        const state = get();
        const hero = state.roster.find(h => h.instanceId === heroInstanceId);

        if (!hero) {
          console.error('Hero not found:', heroInstanceId);
          return;
        }

        // Check if ability exists in learnable abilities
        const ability = LEARNABLE_ABILITIES[abilityId];
        if (!ability) {
          console.error('Ability not found:', abilityId);
          return;
        }

        // Check if hero can learn this ability
        const learnableAbilities = HERO_LEARNABLE_ABILITIES[hero.id];
        if (!learnableAbilities || !learnableAbilities.includes(abilityId)) {
          console.error(`${hero.name} cannot learn ${abilityId}`);
          return;
        }

        // Add ability to hero's abilities array
        const updatedAbilities = [...hero.abilities, { ...ability }];
        state.updateHero(heroInstanceId, { abilities: updatedAbilities });

        console.log(`${hero.name} learned ${ability.name}!`);

        // Clear ability selection state
        set({ abilitySelectionHeroId: null });

        // Get fresh state after updates to ensure we use the updated roster
        const freshState = get();

        // Navigate back to PreBattle screen if we have a selectedStageId, otherwise go to CampaignMap
        if (freshState.selectedStageId) {
          freshState.navigate(ScreenType.PreBattle);
        } else {
          freshState.navigate(ScreenType.CampaignMap);
        }
      },

      // Team selection
      setSelectedTeam: (heroInstanceIds: string[]) =>
        set({ selectedTeam: heroInstanceIds }),

      addToTeam: (heroInstanceId: string) =>
        set((state) => {
          if (state.selectedTeam.includes(heroInstanceId)) {
            return state;
          }
          return {
            selectedTeam: [...state.selectedTeam, heroInstanceId],
          };
        }),

      removeFromTeam: (heroInstanceId: string) =>
        set((state) => ({
          selectedTeam: state.selectedTeam.filter((id) => id !== heroInstanceId),
        })),

      // Campaign progression
      completeStage: (stageId: number) =>
        set((state) => {
          const newStagesCompleted = new Set(state.campaign.stagesCompleted);
          newStagesCompleted.add(stageId);

          return {
            campaign: {
              ...state.campaign,
              stagesCompleted: newStagesCompleted,
              maxStageReached: Math.max(state.campaign.maxStageReached, stageId + 1),
              currentStage: stageId + 1,
            },
          };
        }),

      unlockFeature: (featureName: string) =>
        set((state) => {
          const newUnlockedFeatures = new Set(state.unlockedFeatures);
          newUnlockedFeatures.add(featureName);
          return { unlockedFeatures: newUnlockedFeatures };
        }),

      // Battle speed control
      setBattleSpeed: (speed: number) => set({ battleSpeed: speed }),

      // Pre-Battle team management
      setPreBattleTeam: (heroIds: string[]) => {
        const state = get();
        set({ preBattleTeam: heroIds });

        // Regenerate Pre-Battle layout with new team
        if (state.currentScreen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Temporarily disable card animations for smooth update
            (window as any).__disableCardAnimations = true;

            const newOccupants = createPreBattleLayout(
              stage,
              state.player.gold,
              state.player.gems,
              heroIds,
              state.roster,
              state.navigate,
              state.addHeroToPreBattle,
              state.removeHeroFromPreBattle,
              state.startBattle,
              state.setPreBattleTeam,
              state.equipItem
            );
            set({ gridOccupants: newOccupants });

            // Re-enable animations after a brief delay
            setTimeout(() => {
              (window as any).__disableCardAnimations = false;
            }, 50);
          }
        }
      },

      addHeroToPreBattle: (heroId: string) => {
        const state = get();
        // Check if hero is already in team (ignoring empty slots)
        const filledSlots = state.preBattleTeam.filter(id => id && id !== '');
        if (filledSlots.includes(heroId)) {
          return;
        }

        const newTeam = [...state.preBattleTeam, heroId];
        set({ preBattleTeam: newTeam });

        // Regenerate Pre-Battle layout with new team
        if (state.currentScreen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Temporarily disable card animations for smooth update
            (window as any).__disableCardAnimations = true;

            const newOccupants = createPreBattleLayout(
              stage,
              state.player.gold,
              state.player.gems,
              newTeam,
              state.roster,
              state.navigate,
              state.addHeroToPreBattle,
              state.removeHeroFromPreBattle,
              state.startBattle,
              state.setPreBattleTeam,
              state.equipItem
            );
            set({ gridOccupants: newOccupants });

            // Re-enable animations after a brief delay
            setTimeout(() => {
              (window as any).__disableCardAnimations = false;
            }, 50);
          }
        }
      },

      removeHeroFromPreBattle: (heroId: string) => {
        const state = get();
        const newTeam = state.preBattleTeam.filter((id) => id !== heroId);
        set({ preBattleTeam: newTeam });

        // Regenerate Pre-Battle layout with new team
        if (state.currentScreen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Temporarily disable card animations for smooth update
            (window as any).__disableCardAnimations = true;

            const newOccupants = createPreBattleLayout(
              stage,
              state.player.gold,
              state.player.gems,
              newTeam,
              state.roster,
              state.navigate,
              state.addHeroToPreBattle,
              state.removeHeroFromPreBattle,
              state.startBattle,
              state.setPreBattleTeam,
              state.equipItem
            );
            set({ gridOccupants: newOccupants });

            // Re-enable animations after a brief delay
            setTimeout(() => {
              (window as any).__disableCardAnimations = false;
            }, 50);
          }
        }
      },

      // Battle system
      startBattle: () => {
        const state = get();

        if (!state.selectedStageId || state.preBattleTeam.length === 0) {
          console.error('Cannot start battle: no stage or team selected');
          return;
        }

        const stage = getStageById(state.selectedStageId);
        if (!stage) return;

        // Get location to determine grid size
        const location = getLocationByStageId(state.selectedStageId);
        if (location && location.gridSize) {
          // Set grid size based on location
          state.setGridSize(location.gridSize.rows, location.gridSize.cols);
        } else {
          // Default to 8x8 if no grid size specified
          state.setGridSize(8, 8);
        }

        // Get selected heroes
        const heroes = state.preBattleTeam
          .map((heroId) => state.roster.find((h) => h.instanceId === heroId))
          .filter((h) => h !== undefined) as Hero[];

        if (heroes.length === 0) return;

        // Create enemies from stage with scaling based on stage number
        const enemies = stage.enemies.map((enemyType) =>
          createEnemyInstance(enemyType, state.selectedStageId)
        );

        // Run battle simulation to get all events
        const simulator = new BattleSimulator(heroes, enemies);
        const battleState = simulator.simulate();

        console.log('Battle started with events:', battleState.events.length);
        console.log('Initial hero positions:', battleState.heroes.map(h => h.position));
        console.log('Initial enemy positions:', battleState.enemies.map(e => e.position));

        // IMPORTANT: Reset battle state to initial state before any events
        // The simulator mutates state during simulate(), so we need to restore them
        battleState.heroes.forEach((hero, index) => {
          // Spread heroes across multiple rows if needed
          const row = 3 + Math.floor(index / 2); // Row 3-5
          const col = index % 2; // Col 0-1
          hero.position = { row, col };
          hero.isAlive = true;
          hero.stats.hp = hero.stats.maxHp;
          hero.cooldown = 0; // Reset cooldown to 0
        });

        battleState.enemies.forEach((enemy, index) => {
          // Spread enemies across multiple rows if needed
          const row = 3 + Math.floor(index / 2); // Row 3-5
          const col = 7 - (index % 2); // Col 6-7
          enemy.position = { row, col };
          enemy.isAlive = true;
          enemy.stats.hp = enemy.stats.maxHp;
          enemy.cooldown = 0; // Reset cooldown to 0
        });

        // Switch to battle music
        audioManager.playMusic('/Goblins_Dance_(Battle).wav', true, 0.5);

        // Set battle state and navigate to battle screen
        set({
          currentBattle: battleState,
          battleEventIndex: 0,
        });

        // Navigate to battle screen with transition
        if ((window as any).__gridNavigate) {
          (window as any).__gridNavigate(ScreenType.Battle);
        } else {
          state.navigate(ScreenType.Battle);
        }
      },

      advanceBattleEvent: () => {
        const state = get();
        if (!state.currentBattle) return;

        const nextIndex = state.battleEventIndex + 1;

        if (nextIndex < state.currentBattle.events.length) {
          // Apply the event to update battle state
          const event = state.currentBattle.events[nextIndex];

          // Update positions, HP, cooldowns, and alive status based on event
          if (event.type === 'tick') {
            // Update all unit cooldowns from tick event
            if (event.data.cooldowns) {
              event.data.cooldowns.forEach((update: any) => {
                const unit = [...state.currentBattle!.heroes, ...state.currentBattle!.enemies]
                  .find(u => u.id === update.unitId);
                if (unit) {
                  unit.cooldown = update.cooldown;
                }
              });
            }
          } else if (event.type === 'move') {
            const unit = [...state.currentBattle.heroes, ...state.currentBattle.enemies]
              .find(u => u.id === event.data.unitId);
            if (unit) {
              unit.position = event.data.to;
            }
          } else if (event.type === 'damage') {
            const unit = [...state.currentBattle.heroes, ...state.currentBattle.enemies]
              .find(u => u.id === event.data.targetId);
            if (unit) {
              unit.stats.hp = event.data.remainingHp;
            }
          } else if (event.type === 'death') {
            const unit = [...state.currentBattle.heroes, ...state.currentBattle.enemies]
              .find(u => u.id === event.data.unitId);
            if (unit) {
              unit.isAlive = false;
            }
          }

          set({ battleEventIndex: nextIndex });

          // Regenerate battle layout with updated state
          const newOccupants = createBattleLayout(
            state.currentBattle,
            nextIndex,
            state.advanceBattleEvent,
            state.battleSpeed,
            () => {
              // Cycle through 1x, 4x, and 8x speed
              const newSpeed = state.battleSpeed === 1 ? 4 : state.battleSpeed === 4 ? 8 : 1;
              state.setBattleSpeed(newSpeed);
            }
          );
          set({ gridOccupants: newOccupants });
        } else {
          // Battle finished - handle victory/defeat
          console.log('Battle finished! Winner:', state.currentBattle.winner);

          let shouldAutoAdvance = false;
          let nextStageId: number | null = null;

          if (state.currentBattle.winner === 'heroes' && state.selectedStageId) {
            // Award rewards and mark stage as completed
            const stage = getStageById(state.selectedStageId);
            if (stage) {
              console.log('Completing stage:', state.selectedStageId);
              state.addGold(stage.rewards.gold);
              state.addExperience(stage.rewards.experience);

              // Award gems for boss stages
              if (stage.rewards.gems && stage.rewards.gems > 0) {
                state.addGems(stage.rewards.gems);
                console.log(`Boss defeated! Awarded ${stage.rewards.gems} gems!`);
              }

              // Award XP to all participating heroes
              const xpPerHero = Math.floor(stage.rewards.experience / state.preBattleTeam.length);
              state.preBattleTeam.forEach(heroId => {
                state.awardHeroExperience(heroId, xpPerHero);
              });

              state.completeStage(state.selectedStageId);

              // Check if any hero needs to select an ability
              // If so, don't auto-advance - let the player make their choice first
              const freshState = get();
              if (freshState.abilitySelectionHeroId) {
                console.log('Hero needs to select ability - pausing auto-advance');
                shouldAutoAdvance = false;
              } else {
                // Check if there's a next unlocked stage to auto-advance to
                const newCompletedStages = new Set(state.campaign.stagesCompleted);
                newCompletedStages.add(state.selectedStageId);
                nextStageId = getNextUnlockedStage(newCompletedStages);

                // Get current location
                const currentLocation = getLocationByStageId(state.selectedStageId);
                const nextLocation = nextStageId ? getLocationByStageId(nextStageId) : null;

                // Auto-advance only if:
                // 1. Next stage exists and isn't past the end
                // 2. Next stage is in the SAME location (don't auto-advance to new locations)
                if (nextStageId && nextStageId <= 512 &&
                    currentLocation && nextLocation &&
                    currentLocation.id === nextLocation.id) {
                  shouldAutoAdvance = true;
                  console.log('Auto-advancing to next stage in same location:', nextStageId);
                } else if (currentLocation && nextLocation && currentLocation.id !== nextLocation.id) {
                  console.log('Location completed! Returning to location map.');
                }
              }
            }
          }

          // Clear battle state
          set({
            currentBattle: null,
            battleEventIndex: 0,
          });

          if (shouldAutoAdvance && nextStageId) {
            // Auto-advance to next stage - start battle immediately
            // Keep battle music playing for smooth transition
            console.log('Auto-advancing to next stage:', nextStageId);

            // Set the next stage
            set({ selectedStageId: nextStageId });

            // Small delay to ensure state is updated, then start battle directly
            setTimeout(() => {
              const freshState = get();

              // CRITICAL: Double-check that no ability selection is pending
              // This prevents auto-advance from overriding ability selection at high speeds
              if (freshState.abilitySelectionHeroId) {
                console.log('Ability selection detected in auto-advance - cancelling auto-advance');
                return;
              }

              // Get location to determine grid size for next battle
              const location = getLocationByStageId(nextStageId);
              if (location && location.gridSize) {
                freshState.setGridSize(location.gridSize.rows, location.gridSize.cols);
              } else {
                freshState.setGridSize(8, 8);
              }

              // Start the next battle immediately
              freshState.startBattle();
            }, 800);
          } else {
            // Check if ability selection is pending - if so, don't navigate anywhere
            // The navigation already happened when setAbilitySelectionHero was called
            const freshState = get();
            if (freshState.abilitySelectionHeroId) {
              console.log('Ability selection screen active - staying on ability selection');
              // Don't navigate, don't change music, stay on ability selection screen
              return;
            }

            // Defeat, location completed, or no more stages - return to location/campaign map
            const wasVictory = state.currentBattle?.winner === 'heroes';
            const currentLocation = state.selectedStageId ? getLocationByStageId(state.selectedStageId) : null;
            const nextLocation = nextStageId ? getLocationByStageId(nextStageId) : null;

            // Determine where to navigate
            let targetScreen = ScreenType.CampaignMap;
            if (wasVictory && currentLocation && nextLocation && currentLocation.id !== nextLocation.id) {
              // Location completed - return to location map
              targetScreen = ScreenType.LocationMap;
              console.log('Location completed! Returning to location map.');
            } else if (!wasVictory) {
              // Defeat - return to campaign map
              targetScreen = ScreenType.CampaignMap;
              console.log('Defeat! Returning to campaign map.');
            } else {
              // All stages completed
              targetScreen = ScreenType.LocationMap;
              console.log('All stages completed! Returning to location map.');
            }

            // Switch back to main menu music
            audioManager.playMusic('/Goblins_Den_(Regular).wav', true, 0.5);

            // Clear selected stage
            set({ selectedStageId: null });

            // Use transition-aware navigate if available, otherwise fallback to direct navigate
            if ((window as any).__gridNavigate) {
              (window as any).__gridNavigate(targetScreen);
            } else {
              state.navigate(targetScreen);
            }
          }
        }
      },

      // Shop management
      refreshShop: () => {
        // Get random items (6-10 items)
        const itemCount = Math.floor(Math.random() * 5) + 6;
        const newItems = getRandomItems(itemCount, Rarity.Epic);

        // Get random heroes (2-4 heroes)
        const heroCount = Math.floor(Math.random() * 3) + 2;
        const availableHeroIds = Object.keys(HERO_TEMPLATES);
        const selectedHeroIds = availableHeroIds
          .sort(() => Math.random() - 0.5)
          .slice(0, heroCount);
        const newHeroes = selectedHeroIds.map(id => createHeroInstance(id, 1) as Hero);

        set({
          shopItems: newItems,
          shopHeroes: newHeroes,
        });

        // Regenerate shop layout if currently on shop screen
        const state = get();
        if (state.currentScreen === ScreenType.Shop) {
          const newOccupants = createShopLayout(
            state.player.gold,
            state.player.gems,
            newItems,
            newHeroes,
            state.navigate,
            state.purchaseItem,
            state.purchaseHero,
            state.refreshShop
          );
          set({ gridOccupants: newOccupants });
        }
      },

      purchaseItem: (itemId: string) => {
        const state = get();
        const item = state.shopItems.find(i => i.id === itemId);

        if (!item) {
          console.error('Item not found in shop:', itemId);
          return false;
        }

        // Check if player has enough gold
        if (state.player.gold < item.cost) {
          console.log('Not enough gold to purchase item');
          return false;
        }

        // Deduct gold and add item to inventory
        if (state.spendGold(item.cost)) {
          state.addItem(item);

          // Regenerate shop layout with updated gold
          if (state.currentScreen === ScreenType.Shop) {
            const newOccupants = createShopLayout(
              state.player.gold,
              state.player.gems,
              state.shopItems,
              state.shopHeroes,
              state.navigate,
              state.purchaseItem,
              state.purchaseHero,
              state.refreshShop
            );
            set({ gridOccupants: newOccupants });
          }

          console.log(`Purchased ${item.name} for ${item.cost} gold`);
          return true;
        }

        return false;
      },

      purchaseHero: (heroId: string) => {
        const state = get();
        const hero = state.shopHeroes.find(h => h.id === heroId);

        if (!hero) {
          console.error('Hero not found in shop:', heroId);
          return false;
        }

        // Calculate hero cost based on rarity/tier
        const heroCost = getHeroGemCost(hero.rarity);

        // Check if player has enough gems (not gold!)
        if (state.player.gems < heroCost) {
          console.log(`Not enough gems to purchase hero. Need ${heroCost}, have ${state.player.gems}`);
          return false;
        }

        // Deduct gems and add hero to roster
        if (state.spendGems(heroCost)) {
          // Create a new instance to avoid conflicts
          const newHero = createHeroInstance(hero.id, 1) as Hero;
          state.addHero(newHero);

          // Remove hero from shop
          const newShopHeroes = state.shopHeroes.filter(h => h !== hero);
          set({ shopHeroes: newShopHeroes });

          // Regenerate shop layout with updated gems and heroes
          if (state.currentScreen === ScreenType.Shop) {
            const newOccupants = createShopLayout(
              state.player.gold,
              state.player.gems,
              state.shopItems,
              newShopHeroes,
              state.navigate,
              state.purchaseItem,
              state.purchaseHero,
              state.refreshShop
            );
            set({ gridOccupants: newOccupants });
          }

          console.log(`Purchased ${hero.name} for ${heroCost} gems`);
          return true;
        }

        return false;
      },

      // Reset game
      resetGame: () => set(initialState),
    }),
    {
      name: 'gridder-game-storage',
      partialize: (state) => ({
        player: state.player,
        roster: state.roster,
        inventory: state.inventory,
        campaign: {
          ...state.campaign,
          stagesCompleted: Array.from(state.campaign.stagesCompleted),
        },
        unlockedFeatures: Array.from(state.unlockedFeatures),
        selectedTeam: state.selectedTeam,
        preBattleTeam: state.preBattleTeam, // Persist team composition
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Sets
          state.campaign.stagesCompleted = new Set(
            state.campaign.stagesCompleted as unknown as number[]
          );
          state.unlockedFeatures = new Set(
            state.unlockedFeatures as unknown as string[]
          );

          // Ensure roster has starter heroes if empty
          if (!state.roster || state.roster.length === 0) {
            state.roster = starterHeroes as Hero[];
          }
        }
      },
    }
  )
);
