import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';

/**
 * Hook to auto-advance battle events
 * @param baseDelay - Base delay in ms between battle events (default: 200ms for tick-based system)
 */
export function useBattleAutoAdvance(baseDelay: number = 200) {
  const { currentScreen, currentBattle, battleEventIndex, battleSpeed, advanceBattleEvent } = useGameStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run in battle screen
    if (currentScreen !== ScreenType.Battle || !currentBattle) {
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Check if battle is finished (we need to process all events including the last one)
    const isFinished = battleEventIndex >= currentBattle.events.length;

    if (!isFinished) {
      // Schedule next event with speed adjustment
      const adjustedDelay = baseDelay / battleSpeed;
      timerRef.current = setTimeout(() => {
        advanceBattleEvent();
      }, adjustedDelay);
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentScreen, currentBattle, battleEventIndex, baseDelay, battleSpeed, advanceBattleEvent]);
}
