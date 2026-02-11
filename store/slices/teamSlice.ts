import type { StoreSet, StoreGet } from '../storeTypes';

export const teamInitialState = {
  selectedTeam: [] as string[],
};

export function createTeamSlice(set: StoreSet, get: StoreGet) {
  return {
    ...teamInitialState,

    setSelectedTeam: (heroInstanceIds: string[]) =>
      set({ selectedTeam: heroInstanceIds }),

    addToTeam: (heroInstanceId: string) => {
      const state = get();
      if (!state.selectedTeam.includes(heroInstanceId)) {
        set({ selectedTeam: [...state.selectedTeam, heroInstanceId] });
      }
    },

    removeFromTeam: (heroInstanceId: string) => {
      const state = get();
      set({ selectedTeam: state.selectedTeam.filter(id => id !== heroInstanceId) });
    },
  };
}
