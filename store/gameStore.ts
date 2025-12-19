import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, ScreenType, PlayerData, CampaignProgress } from '@/types/progression.types';
import { Hero, Item } from '@/types/core.types';
import { AnyGridOccupant } from '@/types/grid.types';
import { createMainMenuLayout } from '@/screens/MainMenu/MainMenuLayout';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';

interface GameStore extends GameState {
  // Grid management
  gridOccupants: AnyGridOccupant[];
  updateGridOccupants: (occupants: AnyGridOccupant[]) => void;

  // Navigation (now updates grid instead of changing screens)
  navigate: (screen: ScreenType) => void;

  // Campaign state
  selectedStageId: number | null;
  setSelectedStageId: (stageId: number | null) => void;

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

const initialState = {
  player: initialPlayerData,
  roster: [] as Hero[],
  inventory: [] as Item[],
  campaign: initialCampaignProgress,
  unlockedFeatures: new Set<string>(['mainMenu', 'campaignMap']),
  currentScreen: ScreenType.MainMenu,
  selectedTeam: [] as string[],
  gridOccupants: [] as AnyGridOccupant[],
  selectedStageId: null as number | null,
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
        set({ currentScreen: screen, selectedStageId: null });

        // Generate new grid occupants based on screen
        let newOccupants: AnyGridOccupant[] = [];

        if (screen === ScreenType.MainMenu) {
          newOccupants = createMainMenuLayout(
            state.player.gold,
            state.player.gems,
            state.player.level,
            state.navigate
          );
        } else if (screen === ScreenType.CampaignMap) {
          newOccupants = createCampaignMapLayout(
            state.campaign.stagesCompleted,
            state.navigate,
            state.setSelectedStageId,
            state.selectedStageId
          );
        }

        set({ gridOccupants: newOccupants });
      },

      // Campaign state
      setSelectedStageId: (stageId: number | null) => {
        const state = get();
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
        }
      },
    }
  )
);
