import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, ScreenType, PlayerData, CampaignProgress } from '@/types/progression.types';
import { Hero, Item, ItemInstance } from '@/types/core.types';
import { AnyGridOccupant } from '@/types/grid.types';
import { createMainMenuLayout } from '@/screens/MainMenu/MainMenuLayout';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';
import { createPreBattleLayout } from '@/screens/PreBattle/PreBattleLayout';
import { createBattleLayout } from '@/screens/Battle/BattleLayout';
import { createHeroRosterLayout } from '@/screens/HeroRoster/HeroRosterLayout';
import { createShopLayout } from '@/screens/Shop/ShopLayout';
import { createHeroInstance, createEnemyInstance } from '@/data/units';
import { getStageById } from '@/data/stages';
import { BattleSimulator, BattleState } from '@/systems/BattleSimulator';
import { audioManager } from '@/utils/audioManager';
import { getRandomItems, ITEM_TEMPLATES } from '@/data/items';
import { HERO_TEMPLATES } from '@/data/units';
import { Rarity } from '@/types/core.types';

interface GameStore extends GameState {
  // Grid management
  gridOccupants: AnyGridOccupant[];
  updateGridOccupants: (occupants: AnyGridOccupant[]) => void;

  // Navigation (now updates grid instead of changing screens, returns new occupant count)
  navigate: (screen: ScreenType) => number;

  // Campaign state
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
  gems: 50,
  level: 1,
  experience: 0,
  maxExperience: 100,
};

const initialCampaignProgress: CampaignProgress = {
  currentStage: 1,
  maxStageReached: 1,
  stagesCompleted: new Set<number>(),
};

// Create starter heroes
const starterHeroes = [
  createHeroInstance('quester', 1),
  createHeroInstance('blood_knight', 1),
  createHeroInstance('shadow_stalker', 1),
];

const initialState = {
  player: initialPlayerData,
  roster: starterHeroes as Hero[],
  inventory: [] as ItemInstance[],
  campaign: initialCampaignProgress,
  unlockedFeatures: new Set<string>(['mainMenu', 'campaignMap']),
  currentScreen: ScreenType.MainMenu,
  selectedTeam: [] as string[],
  gridOccupants: [] as AnyGridOccupant[],
  selectedStageId: null as number | null,
  preBattleTeam: [] as string[],
  currentBattle: null as BattleState | null,
  battleEventIndex: 0,
  battleSpeed: 1,
  shopItems: [] as Item[],
  shopHeroes: [] as Hero[],
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Grid management
      updateGridOccupants: (occupants: AnyGridOccupant[]) =>
        set({ gridOccupants: occupants }),

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
        } else if (screen === ScreenType.CampaignMap) {
          newOccupants = createCampaignMapLayout(
            state.campaign.stagesCompleted,
            state.navigate,
            state.setSelectedStageId,
            state.selectedStageId
          );
        } else if (screen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Auto-select first hero if team is empty
            let team = state.preBattleTeam;
            if (team.length === 0 && state.roster.length > 0) {
              team = [state.roster[0].instanceId];
              set({ preBattleTeam: team });
            }

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
        }

        set({ gridOccupants: newOccupants });

        // Return the count of new occupants
        return newOccupants.length;
      },

      // Campaign state
      setSelectedStageId: (stageId: number | null) => {
        const state = get();
        console.log('setSelectedStageId called with:', stageId);
        set({ selectedStageId: stageId });

        // Regenerate campaign map with new selected stage
        const newOccupants = createCampaignMapLayout(
          state.campaign.stagesCompleted,
          state.navigate,
          state.setSelectedStageId,
          stageId
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
      addHero: (hero: Hero) =>
        set((state) => ({
          roster: [...state.roster, hero],
        })),

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
        const hero = state.roster.find(h => h.instanceId === heroInstanceId);
        if (!hero) return;

        // Start with base stats
        let newStats = { ...hero.baseStats };

        // Apply equipped item effects
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
        set((state) => ({
          roster: state.roster.map(h =>
            h.instanceId === heroInstanceId
              ? { ...h, currentStats: newStats }
              : h
          ),
        }));
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

        // Get selected heroes
        const heroes = state.preBattleTeam
          .map((heroId) => state.roster.find((h) => h.instanceId === heroId))
          .filter((h) => h !== undefined) as Hero[];

        if (heroes.length === 0) return;

        // Create enemies from stage
        const enemies = stage.enemies.map((enemyType) =>
          createEnemyInstance(enemyType)
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
          if (state.currentBattle.winner === 'heroes' && state.selectedStageId) {
            // Award rewards and mark stage as completed
            const stage = getStageById(state.selectedStageId);
            if (stage) {
              console.log('Completing stage:', state.selectedStageId);
              state.addGold(stage.rewards.gold);
              state.addExperience(stage.rewards.experience);
              state.completeStage(state.selectedStageId);
            }
          }

          // Switch back to main menu music
          audioManager.playMusic('/Goblins_Den_(Regular).wav', true, 0.5);

          // Navigate back to campaign map with transition
          set({
            currentBattle: null,
            battleEventIndex: 0,
            preBattleTeam: [],
            selectedStageId: null, // Clear selected stage
          });

          console.log('Navigating back to campaign map');
          // Use transition-aware navigate if available, otherwise fallback to direct navigate
          if ((window as any).__gridNavigate) {
            (window as any).__gridNavigate(ScreenType.CampaignMap);
          } else {
            state.navigate(ScreenType.CampaignMap);
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

        const heroCost = 200; // Fixed cost for now

        // Check if player has enough gold
        if (state.player.gold < heroCost) {
          console.log('Not enough gold to purchase hero');
          return false;
        }

        // Deduct gold and add hero to roster
        if (state.spendGold(heroCost)) {
          // Create a new instance to avoid conflicts
          const newHero = createHeroInstance(hero.id, 1) as Hero;
          state.addHero(newHero);

          // Remove hero from shop
          const newShopHeroes = state.shopHeroes.filter(h => h !== hero);
          set({ shopHeroes: newShopHeroes });

          // Regenerate shop layout with updated gold and heroes
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

          console.log(`Purchased ${hero.name} for ${heroCost} gold`);
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
