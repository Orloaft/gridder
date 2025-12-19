import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, ScreenType, PlayerData, CampaignProgress } from '@/types/progression.types';
import { Hero, Item } from '@/types/core.types';
import { AnyGridOccupant } from '@/types/grid.types';
import { createMainMenuLayout } from '@/screens/MainMenu/MainMenuLayout';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';
import { createPreBattleLayout } from '@/screens/PreBattle/PreBattleLayout';
import { createBattleLayout } from '@/screens/Battle/BattleLayout';
import { createHeroRosterLayout } from '@/screens/HeroRoster/HeroRosterLayout';
import { createHeroInstance, createEnemyInstance } from '@/data/units';
import { getStageById } from '@/data/stages';
import { BattleSimulator, BattleState } from '@/systems/BattleSimulator';
import { audioManager } from '@/utils/audioManager';

interface GameStore extends GameState {
  // Grid management
  gridOccupants: AnyGridOccupant[];
  updateGridOccupants: (occupants: AnyGridOccupant[]) => void;

  // Navigation (now updates grid instead of changing screens)
  navigate: (screen: ScreenType) => void;

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

  // Team selection
  setSelectedTeam: (heroInstanceIds: string[]) => void;
  addToTeam: (heroInstanceId: string) => void;
  removeFromTeam: (heroInstanceId: string) => void;

  // Campaign progression
  completeStage: (stageId: number) => void;
  unlockFeature: (featureName: string) => void;

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
  inventory: [] as Item[],
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
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Grid management
      updateGridOccupants: (occupants: AnyGridOccupant[]) =>
        set({ gridOccupants: occupants }),

      // Navigation (updates grid occupants based on screen)
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
              state.setPreBattleTeam
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
        }

        set({ gridOccupants: newOccupants });
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
      addItem: (item: Item) =>
        set((state) => ({
          inventory: [...state.inventory, item],
        })),

      removeItem: (itemId: string) =>
        set((state) => ({
          inventory: state.inventory.filter((i) => i.id !== itemId),
        })),

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
              state.setPreBattleTeam
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
              state.setPreBattleTeam
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
              state.setPreBattleTeam
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
