import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';

/**
 * Hook to auto-advance battle events
 * @param baseDelay - Base delay in ms between battle events (default: 200ms for tick-based system)
 */
export function useBattleAutoAdvance(baseDelay: number = 200) {
  const { currentScreen, currentBattle, battleEventIndex, battleSpeed, advanceBattleEvent, useDeterministicBattle } = useGameStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const entranceDelayRef = useRef<boolean>(false);
  const battleIdRef = useRef<string | null>(null);
  const transitionCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset entrance delay flag when battle changes
    if (currentBattle && battleIdRef.current !== currentBattle.id) {
      battleIdRef.current = currentBattle.id;
      entranceDelayRef.current = false;
      console.log('[useBattleAutoAdvance] New battle detected, resetting entrance delay flag');
    }
    console.log('[useBattleAutoAdvance] useEffect triggered', {
      currentScreen,
      hasBattle: !!currentBattle,
      battleEventIndex,
      battleSpeed,
      useDeterministicBattle,
    });

    // V2 deterministic system works WITH auto-advance, not instead of it
    // The V2 system generates standard BattleEvents that auto-advance processes normally

    // Only run in battle screen
    if (currentScreen !== ScreenType.Battle || !currentBattle) {
      console.log('[useBattleAutoAdvance] Not in battle or no battle state, skipping');
      return;
    }

    // Wait for grid transition to complete before starting battle
    // Poll for the transition flag to clear
    if ((window as any).__isGridTransition) {
      console.log('[useBattleAutoAdvance] Grid transition in progress, waiting...');

      // For Battle screen, actively poll for transition completion
      if (currentScreen === ScreenType.Battle && currentBattle) {
        // Clear any existing check timer
        if (transitionCheckRef.current) {
          clearInterval(transitionCheckRef.current);
        }

        // Poll every 100ms to check if transition is complete
        transitionCheckRef.current = setInterval(() => {
          if (!(window as any).__isGridTransition) {
            console.log('[useBattleAutoAdvance] Grid transition complete, proceeding with battle');
            clearInterval(transitionCheckRef.current!);
            transitionCheckRef.current = null;

            // If this is the first event, add entrance delay then start
            if (battleEventIndex === 0 && !entranceDelayRef.current) {
              entranceDelayRef.current = true;
              console.log('[useBattleAutoAdvance] Adding entrance delay after transition');
              setTimeout(() => {
                console.log('[useBattleAutoAdvance] Starting battle after entrance delay');
                advanceBattleEvent();
              }, 2000);
            } else {
              // Otherwise just continue advancing
              advanceBattleEvent();
            }
          } else {
            console.log('[useBattleAutoAdvance] Still waiting for grid transition...');
          }
        }, 100);

        // Safety mechanism: force clear after 3 seconds
        const safetyClear = setTimeout(() => {
          if ((window as any).__isGridTransition) {
            console.warn('[useBattleAutoAdvance] Force clearing grid transition flag after 3s timeout');
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
      console.log('[useBattleAutoAdvance] First event - adding 2s delay for entrance animations');
      const entranceTimer = setTimeout(() => {
        console.log('[useBattleAutoAdvance] Entrance delay complete, starting battle');
        // Final check to ensure transition is complete
        (window as any).__isGridTransition = false;
        advanceBattleEvent();
      }, 2000); // 2 second delay for entrance animations
      return () => clearTimeout(entranceTimer);
    }

    console.log('[useBattleAutoAdvance] In battle, proceeding with auto-advance setup');

    // Get the current event to check its type
    const currentEvent = currentBattle.events[battleEventIndex];
    const isWaveTransition = currentEvent?.type === BattleEventType.WaveTransition;
    const isWaveComplete = currentEvent?.type === BattleEventType.WaveComplete;

    if (isWaveComplete) {
      console.log('[useBattleAutoAdvance] Wave complete detected - pausing auto-advance');
      return; // Don't auto-advance during wave complete - wait for player decision
    }

    // Check if we just passed a WaveComplete event and should resume
    const prevEvent = battleEventIndex > 0 ? currentBattle.events[battleEventIndex - 1] : null;
    if (prevEvent?.type === BattleEventType.WaveComplete) {
      console.log('[useBattleAutoAdvance] Just passed WaveComplete, resuming auto-advance');
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

      // Add extra delay for wave transitions
      let adjustedDelay = hasOngoingAnimation ? baseDelay : baseDelay / battleSpeed;
      if (isWaveTransition) {
        adjustedDelay = 1500; // 1.5 second delay for wave transition animation
      }
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
