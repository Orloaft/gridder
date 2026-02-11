import { PlayerData, CampaignProgress, ScreenType } from '@/types/progression.types';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';
import type { StoreSet, StoreGet } from '../storeTypes';

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
  locationsCompleted: new Set<string>(),
};

export const playerInitialState = {
  player: initialPlayerData,
  campaign: initialCampaignProgress,
  currentScreen: ScreenType.MainMenu,
  selectedLocationId: null as string | null,
  selectedStageId: null as number | null,
  unlockedFeatures: new Set<string>(['mainMenu', 'locationMap']),
  pendingRewards: null,
};

export function createPlayerSlice(set: StoreSet, get: StoreGet) {
  return {
    ...playerInitialState,

    // Campaign state
    setSelectedLocationId: (locationId: string | null) => {
      set({ selectedLocationId: locationId });
    },

    setSelectedStageId: (stageId: number | null) => {
      const state = get();
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

    completeLocation: (locationId: string) =>
      set((state) => {
        const newLocationsCompleted = new Set(state.campaign.locationsCompleted);
        newLocationsCompleted.add(locationId);

        return {
          campaign: {
            ...state.campaign,
            locationsCompleted: newLocationsCompleted,
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

    // Reward management
    setPendingRewards: (rewards: any) => set({ pendingRewards: rewards }),
  };
}
