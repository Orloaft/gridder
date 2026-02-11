import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/types/battle.types';

/**
 * Hook to auto-advance battle events
 * @param baseDelay - Base delay in ms between battle events (default: 200ms for tick-based system)
 */
export function useBattleAutoAdvance(baseDelay: number = 200) {
  const { currentScreen, currentBattle, battleEventIndex, battleSpeed, advanceBattleEvent } = useGameStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const entranceDelayRef = useRef<boolean>(false);
  const battleIdRef = useRef<string | null>(null);
  const transitionCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset entrance delay flag when battle changes
    if (currentBattle && battleIdRef.current !== currentBattle.id) {
      battleIdRef.current = currentBattle.id;
      entranceDelayRef.current = false;
    }

    // V2 deterministic system works WITH auto-advance, not instead of it
    // The V2 system generates standard BattleEvents that auto-advance processes normally

    // Only run in battle screen
    if (currentScreen !== ScreenType.Battle || !currentBattle) {
      return;
    }

    // Wait for grid transition to complete before starting battle
    // Poll for the transition flag to clear
    if ((window as any).__isGridTransition) {
      // For Battle screen, actively poll for transition completion
      if (currentScreen === ScreenType.Battle && currentBattle) {
        // Clear any existing check timer
        if (transitionCheckRef.current) {
          clearInterval(transitionCheckRef.current);
        }

        // Poll every 100ms to check if transition is complete
        transitionCheckRef.current = setInterval(() => {
          if (!(window as any).__isGridTransition) {
            clearInterval(transitionCheckRef.current!);
            transitionCheckRef.current = null;

            // If this is the first event, add entrance delay then start
            if (battleEventIndex === 0 && !entranceDelayRef.current) {
              entranceDelayRef.current = true;
              setTimeout(() => {
                advanceBattleEvent();
              }, 2000);
            } else {
              // Otherwise just continue advancing
              advanceBattleEvent();
            }
          }
        }, 100);

        // Safety mechanism: force clear after 3 seconds
        const safetyClear = setTimeout(() => {
          if ((window as any).__isGridTransition) {
            (window as any).__isGridTransition = false;
            if (transitionCheckRef.current) {
              clearInterval(transitionCheckRef.current);
              transitionCheckRef.current = null;
            }
          }
        }, 3000);

        return () => {
          clearTimeout(safetyClear);
          if (transitionCheckRef.current) {
            clearInterval(transitionCheckRef.current);
            transitionCheckRef.current = null;
          }
        };
      }

      return; // Will re-run when transition completes
    }

    // Add initial delay for battle start to ensure entrance animations complete
    if (battleEventIndex === 0 && !entranceDelayRef.current) {
      entranceDelayRef.current = true;
      const entranceTimer = setTimeout(() => {
        // Final check to ensure transition is complete
        (window as any).__isGridTransition = false;
        advanceBattleEvent();
      }, 2000); // 2 second delay for entrance animations
      return () => clearTimeout(entranceTimer);
    }

    // Get the current event to check its type
    const currentEvent = currentBattle.events[battleEventIndex];
    const isWaveTransition = currentEvent?.type === BattleEventType.WaveTransition;
    const isWaveComplete = currentEvent?.type === BattleEventType.WaveComplete;

    if (isWaveComplete) {
      // Continue through wave complete to wave transition automatically
    }

    // Check if we just completed a wave transition - this is where we pause for formation management
    const prevEvent = battleEventIndex > 0 ? currentBattle.events[battleEventIndex - 1] : null;
    if (prevEvent?.type === BattleEventType.WaveTransition) {
      return; // Pause after wave transition so user can manage formation with actual post-scroll positions
    }

    // Initialize animation flags if undefined
    if (window.__abilityAnimationPlaying === undefined) {
      window.__abilityAnimationPlaying = false;
    }
    if (window.__tileAnimationPlaying === undefined) {
      window.__tileAnimationPlaying = false;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Check if we're at the end of current wave events but have more waves
    const isAtEndOfWaveEvents = battleEventIndex >= currentBattle.events.length;
    const hasMoreWaves = currentBattle.currentWave < currentBattle.totalWaves;
    const shouldPauseForFormation = isAtEndOfWaveEvents && hasMoreWaves && !currentBattle.winner;

    if (shouldPauseForFormation) {
      return; // Pause so user can manage formation before next wave simulation
    }

    // Check if battle is finished (we need to process all events including the last one)
    const isFinished = battleEventIndex >= currentBattle.events.length;

    // Check if battle has ended (victory or defeat reached)
    const battleEnded = currentBattle.winner !== null;

    // Continue advancing if not finished, even if battle has ended
    // This ensures we process all remaining events after victory/defeat
    if (!isFinished) {
      // Check if ANY animation is currently playing
      const checkAndAdvance = () => {
        // Wait for both ability animations AND regular tile animations
        if (window.__abilityAnimationPlaying || window.__tileAnimationPlaying) {
          // Animation still playing, check again in 50ms
          timerRef.current = setTimeout(checkAndAdvance, 50);
        } else {
          // All animations finished, advance to next event
          advanceBattleEvent();
        }
      };

      // Only apply speed multiplier if no animations are playing
      // This ensures smooth transitions before speeding up
      const hasOngoingAnimation = window.__abilityAnimationPlaying || window.__tileAnimationPlaying;

      // Add extra delay for wave transitions
      let adjustedDelay = hasOngoingAnimation ? baseDelay : baseDelay / battleSpeed;
      if (isWaveTransition) {
        adjustedDelay = 1500; // 1.5 second delay for wave transition animation
      }
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
