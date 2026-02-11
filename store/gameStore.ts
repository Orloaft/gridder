import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Hero } from '@/types/core.types';
import { GameStore } from './storeTypes';
import { createGridSlice, gridInitialState } from './slices/gridSlice';
import { createPlayerSlice, playerInitialState } from './slices/playerSlice';
import { createTeamSlice, teamInitialState } from './slices/teamSlice';
import { createPreBattleSlice, preBattleInitialState } from './slices/preBattleSlice';
import { createRosterSlice, rosterInitialState } from './slices/rosterSlice';
import { createInventorySlice, inventoryInitialState } from './slices/inventorySlice';
import { createShopSlice, shopInitialState } from './slices/shopSlice';
import { createBattleSlice, battleInitialState } from './slices/battleSlice';
import { createNavigationSlice } from './slices/navigationSlice';

const initialState = {
  ...gridInitialState,
  ...playerInitialState,
  ...teamInitialState,
  ...preBattleInitialState,
  ...rosterInitialState,
  ...inventoryInitialState,
  ...shopInitialState,
  ...battleInitialState,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createGridSlice(set, get),
      ...createPlayerSlice(set, get),
      ...createTeamSlice(set, get),
      ...createPreBattleSlice(set, get),
      ...createRosterSlice(set, get),
      ...createInventorySlice(set, get),
      ...createShopSlice(set, get),
      ...createBattleSlice(set, get),
      ...createNavigationSlice(set, get),

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
        unlockedHeroIds: Array.from(state.unlockedHeroIds),
        selectedTeam: state.selectedTeam,
        preBattleTeam: state.preBattleTeam,
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
          state.campaign.locationsCompleted = new Set(
            state.campaign.locationsCompleted as unknown as string[]
          );
          state.unlockedHeroIds = new Set(
            state.unlockedHeroIds as unknown as string[]
          );

          // Ensure roster has starter heroes if empty
          if (!state.roster || state.roster.length === 0) {
            const { createHeroInstance } = require('@/data/units');
            state.roster = [
              createHeroInstance('quester', 1),
              createHeroInstance('blood_knight', 1),
              createHeroInstance('witch_hunter', 1),
            ] as Hero[];
          }
        }
      },
    }
  )
);
