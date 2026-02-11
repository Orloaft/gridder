import { ScreenType } from '@/types/progression.types';
import { getStageById } from '@/data/stages';
import { createPreBattleLayout } from '@/screens/PreBattle/PreBattleLayout';
import type { StoreSet, StoreGet } from '../storeTypes';

export const preBattleInitialState = {
  preBattleTeam: [] as string[],
  heroFormation: {} as { [heroId: string]: { row: number; col: number } },
  isFormationUserModified: false,
  formationWaveNumber: 0, // Tracks which wave the current formation was initialized for
};

export function createPreBattleSlice(set: StoreSet, get: StoreGet) {
  return {
    ...preBattleInitialState,

    setPreBattleTeam: (heroIds: string[]) => {
      const state = get();

      // Validate team size against stage limit if we have a selected stage
      let validatedTeam = heroIds;
      if (state.selectedStageId) {
        const stage = getStageById(state.selectedStageId);
        if (stage && heroIds.length > stage.playerSlots) {
          validatedTeam = heroIds.slice(0, stage.playerSlots);
        }
      }

      set({ preBattleTeam: validatedTeam });

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

    setHeroFormation: (heroId: string, row: number, col: number) => {
      const state = get();

      // Add hero to team if not already there
      if (!state.preBattleTeam.includes(heroId)) {
        const newTeam = [...state.preBattleTeam, heroId];
        set({ preBattleTeam: newTeam });
      }

      // Update formation position
      const newFormation = {
        ...state.heroFormation,
        [heroId]: { row, col }
      };

      // Check if another hero is at this position and swap if needed
      Object.entries(state.heroFormation).forEach(([otherId, pos]) => {
        if (otherId !== heroId && pos.row === row && pos.col === col) {
          // Remove other hero from this position
          delete newFormation[otherId];
        }
      });

      set({ heroFormation: newFormation });

      // Refresh the screen
      state.navigate(state.currentScreen);
    },

    clearHeroFormation: () => {
      set({ heroFormation: {} });
    },
  };
}
