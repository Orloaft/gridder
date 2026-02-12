import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import {
  RewardRevealManager,
  RevealPhase,
  RevealState,
  BattleRewards,
  RewardItem,
} from '@/systems/RewardRevealManager';
import { createRewardRevealLayout } from '@/screens/RewardReveal/RewardRevealLayout';

export interface RewardRevealHookResult {
  overlayActive: boolean;
  phase: RevealPhase;
  revealState: RevealState | null;
  rewards: BattleRewards | null;
  currentRevealItem: RewardItem | null;
  currentRevealIndex: number;
  onSkip: () => void;
  onContinue: () => void;
}

/**
 * Hook to manage the reward reveal lifecycle.
 * Returns overlay state for RewardRevealOverlay + updates grid occupants for items.
 */
export function useRewardReveal(): RewardRevealHookResult {
  const {
    currentScreen,
    pendingRewards,
    setPendingRewards,
    updateGridOccupants,
    navigate,
    addGold,
    addGems,
  } = useGameStore();

  const managerRef = useRef<RewardRevealManager | null>(null);
  const hasStartedRef = useRef(false);

  // Overlay state
  const [phase, setPhase] = useState<RevealPhase>(RevealPhase.VictorySplash);
  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [currentRevealItem, setCurrentRevealItem] = useState<RewardItem | null>(null);
  const [currentRevealIndex, setCurrentRevealIndex] = useState<number>(-1);

  const overlayActive = currentScreen === ScreenType.RewardReveal && !!pendingRewards;

  // Convert pendingRewards to BattleRewards
  const rewards: BattleRewards | null = pendingRewards
    ? {
        goldEarned: pendingRewards.goldEarned,
        gemsEarned: pendingRewards.gemsEarned,
        items: pendingRewards.items,
        breakdown: (pendingRewards as any).breakdown,
      }
    : null;

  const handleSkip = useCallback(() => {
    managerRef.current?.skip();
  }, []);

  const handleContinue = useCallback(() => {
    const state = useGameStore.getState();

    // Apply rewards
    if (state.pendingRewards) {
      state.addGold(state.pendingRewards.goldEarned);
      state.addGems(state.pendingRewards.gemsEarned);
    }

    // Clear
    state.setPendingRewards(null);

    // Stop manager
    managerRef.current?.stop();
    hasStartedRef.current = false;

    // Reset overlay state
    setPhase(RevealPhase.VictorySplash);
    setRevealState(null);
    setCurrentRevealItem(null);
    setCurrentRevealIndex(-1);

    // Reset grid size
    state.setGridSize(8, 8);

    // Navigate
    if (state.levelUpQueue && state.levelUpQueue.length > 0) {
      state.processNextLevelUp();
    } else {
      if ((window as any).__gridNavigate) {
        (window as any).__gridNavigate(ScreenType.LocationMap);
      } else {
        state.navigate(ScreenType.LocationMap);
      }
    }
  }, []);

  useEffect(() => {
    if (currentScreen !== ScreenType.RewardReveal || !pendingRewards) {
      hasStartedRef.current = false;
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const battleRewards: BattleRewards = {
      goldEarned: pendingRewards.goldEarned,
      gemsEarned: pendingRewards.gemsEarned,
      items: pendingRewards.items,
      breakdown: (pendingRewards as any).breakdown,
    };

    const manager = new RewardRevealManager(battleRewards);
    managerRef.current = manager;

    manager.start({
      onStateUpdate: (state) => {
        setRevealState({ ...state });

        // Update grid occupants (items that have landed)
        const gridRewards = manager.getRewards();
        const occupants = createRewardRevealLayout(state, gridRewards, handleSkip);
        updateGridOccupants(occupants);
      },

      onItemReveal: (item, index) => {
        setCurrentRevealItem(item);
        setCurrentRevealIndex(index);
      },

      onPhaseChange: (newPhase) => {
        setPhase(newPhase);
      },
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.stop();
        managerRef.current = null;
      }
      hasStartedRef.current = false;
    };
  }, [currentScreen, pendingRewards, updateGridOccupants, handleSkip]);

  return {
    overlayActive,
    phase,
    revealState,
    rewards,
    currentRevealItem,
    currentRevealIndex,
    onSkip: handleSkip,
    onContinue: handleContinue,
  };
}
