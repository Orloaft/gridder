import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';

/**
 * Hook to auto-advance battle events
 * @param baseDelay - Base delay in ms between battle events (default: 200ms for tick-based system)
 */
export function useBattleAutoAdvance(baseDelay: number = 200) {
  const { currentScreen, currentBattle, battleEventIndex, battleSpeed, advanceBattleEvent } = useGameStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[useBattleAutoAdvance] useEffect triggered', {
      currentScreen,
      hasBattle: !!currentBattle,
      battleEventIndex,
      battleSpeed,
    });

    // Only run in battle screen
    if (currentScreen !== ScreenType.Battle || !currentBattle) {
      console.log('[useBattleAutoAdvance] Not in battle or no battle state, skipping');
      return;
    }

    console.log('[useBattleAutoAdvance] In battle, proceeding with auto-advance setup');

    // Check if current event is a wave transition pause
    const currentEvent = currentBattle.events[battleEventIndex];
    const isWaveTransition = currentEvent?.type === BattleEventType.WaveComplete;

    if (isWaveTransition) {
      console.log('[useBattleAutoAdvance] Wave transition detected - pausing auto-advance');
      return; // Don't auto-advance during wave transitions - wait for player decision
    }

    // Initialize animation flags if undefined
    if (window.__abilityAnimationPlaying === undefined) {
      window.__abilityAnimationPlaying = false;
      console.log('[useBattleAutoAdvance] Initialized __abilityAnimationPlaying to false');
    }
    if (window.__tileAnimationPlaying === undefined) {
      window.__tileAnimationPlaying = false;
      console.log('[useBattleAutoAdvance] Initialized __tileAnimationPlaying to false');
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      console.log('[useBattleAutoAdvance] Cleared existing timer');
    }

    // Check if battle is finished (we need to process all events including the last one)
    const isFinished = battleEventIndex >= currentBattle.events.length;

    // Check if battle has ended (victory or defeat reached)
    const battleEnded = currentBattle.winner !== null;

    console.log('[useBattleAutoAdvance] Battle state check:', {
      isFinished,
      battleEnded,
      battleEventIndex,
      totalEvents: currentBattle.events.length,
      winner: currentBattle.winner,
    });

    // Continue advancing if not finished, even if battle has ended
    // This ensures we process all remaining events after victory/defeat
    if (!isFinished) {
      console.log('[useBattleAutoAdvance] Battle is active, setting up timer');
      // Check if ANY animation is currently playing
      const checkAndAdvance = () => {
        // Wait for both ability animations AND regular tile animations
        if (window.__abilityAnimationPlaying || window.__tileAnimationPlaying) {
          // Animation still playing, check again in 50ms
          console.log('[useBattleAutoAdvance] Waiting for animations:', {
            ability: window.__abilityAnimationPlaying,
            tile: window.__tileAnimationPlaying,
          });
          timerRef.current = setTimeout(checkAndAdvance, 50);
        } else {
          // All animations finished, advance to next event
          console.log('[useBattleAutoAdvance] Advancing to event', battleEventIndex + 1);
          advanceBattleEvent();
        }
      };

      // Only apply speed multiplier if no animations are playing
      // This ensures smooth transitions before speeding up
      const hasOngoingAnimation = window.__abilityAnimationPlaying || window.__tileAnimationPlaying;
      const adjustedDelay = hasOngoingAnimation ? baseDelay : baseDelay / battleSpeed;
      console.log('[useBattleAutoAdvance] Setting timer:', {
        eventIndex: battleEventIndex,
        delay: adjustedDelay,
        speed: battleSpeed,
        hasAnimation: hasOngoingAnimation,
      });
      timerRef.current = setTimeout(checkAndAdvance, adjustedDelay);
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentScreen, currentBattle, battleEventIndex, baseDelay, battleSpeed, advanceBattleEvent]);
}
