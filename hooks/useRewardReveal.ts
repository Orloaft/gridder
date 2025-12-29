import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { RewardRevealManager, RevealPhase } from '@/systems/RewardRevealManager';
import { createRewardRevealLayout } from '@/screens/RewardReveal/RewardRevealLayout';

/**
 * Hook to manage the reward reveal lifecycle
 * Automatically starts the reveal when entering the RewardReveal screen
 */
export function useRewardReveal() {
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

  useEffect(() => {
    // Only run when on reward reveal screen with pending rewards
    if (currentScreen !== ScreenType.RewardReveal || !pendingRewards) {
      hasStartedRef.current = false;
      return;
    }

    // Prevent re-starting if already started
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    console.log('[useRewardReveal] Starting reward reveal - Gold:', pendingRewards.goldEarned, 'Gems:', pendingRewards.gemsEarned, 'Items:', pendingRewards.items.length);

    // Create reward reveal manager
    const manager = new RewardRevealManager(pendingRewards);
    managerRef.current = manager;

    // Handle skip
    const handleSkip = () => {
      console.log('[useRewardReveal] Skip button pressed');
      manager.skip();
    };

    // Handle continue (after summary phase)
    const handleContinue = () => {
      console.log('[useRewardReveal] Continue button pressed');

      // Get fresh state from store
      const state = useGameStore.getState();

      // Apply rewards to player
      if (state.pendingRewards) {
        state.addGold(state.pendingRewards.goldEarned);
        state.addGems(state.pendingRewards.gemsEarned);
        // Items were already added during battle victory
      }

      // Clear pending rewards
      state.setPendingRewards(null);

      // Stop the reveal manager
      manager.stop();
      hasStartedRef.current = false;

      // Reset grid size to default (8x8) before navigating back
      state.setGridSize(8, 8);

      // Navigate back to location map
      if ((window as any).__gridNavigate) {
        (window as any).__gridNavigate(ScreenType.LocationMap);
      } else {
        state.navigate(ScreenType.LocationMap);
      }
    };

    // Start the reveal sequence
    manager.start((state) => {
      // Update grid occupants based on current reveal state
      const particles = manager.getParticleManager().getParticles();
      const rewards = manager.getRewards();

      const newOccupants = createRewardRevealLayout(
        state,
        rewards,
        particles,
        handleSkip,
        handleContinue,
        navigate
      );

      updateGridOccupants(newOccupants);
    });

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.stop();
        managerRef.current = null;
      }
      hasStartedRef.current = false;
    };
  }, [currentScreen, pendingRewards, updateGridOccupants, navigate]);
}
