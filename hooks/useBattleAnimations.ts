import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

/**
 * Hook to handle battle animations based on events
 */
export function useBattleAnimations() {
  const { currentScreen, currentBattle, battleEventIndex } = useGameStore();
  const previousEventIndex = useRef(-1);
  const responsiveDimensions = useResponsiveGrid();

  useEffect(() => {
    // Only run in battle screen
    if (currentScreen !== ScreenType.Battle || !currentBattle) {
      return;
    }

    // Skip if we haven't advanced to a new event
    if (battleEventIndex === previousEventIndex.current) {
      return;
    }

    previousEventIndex.current = battleEventIndex;

    // Get current event
    const event = currentBattle.events[battleEventIndex];
    if (!event) return;

    // Handle different event types with animations
    switch (event.type) {
      case BattleEventType.Move: {
        // Animate unit movement
        // Find the parent wrapper div that has the inline position styles
        const unitCard = document.querySelector(`[data-unit-id="${event.data.unitId}"]`);
        if (unitCard) {
          const unitWrapper = unitCard.parentElement;
          if (unitWrapper instanceof HTMLElement) {
            // Use responsive cell size from grid system
            const cellSize = responsiveDimensions.mainGridCellSize;
            animateTileSlide(
              unitWrapper,
              event.data.from,
              event.data.to,
              cellSize,
              0.3
            );
          }
        }
        break;
      }

      case BattleEventType.Attack: {
        // Animate attacker
        const attackerElement = document.querySelector(`[data-unit-id="${event.data.attackerId}"]`);
        if (attackerElement instanceof HTMLElement) {
          // Determine direction based on if it's a hero or enemy
          const isHero = attackerElement.getAttribute('data-unit-type') === 'hero';
          animateAttack(attackerElement, isHero ? 'right' : 'left');
        }
        break;
      }

      case BattleEventType.Damage: {
        // Animate target taking damage
        const targetElement = document.querySelector(`[data-unit-id="${event.data.targetId}"]`);
        if (targetElement instanceof HTMLElement) {
          animateDamage(targetElement);
        }
        break;
      }

      case BattleEventType.Death: {
        // Animate unit death
        const unitElement = document.querySelector(`[data-unit-id="${event.data.unitId}"]`);
        if (unitElement instanceof HTMLElement) {
          animateDeath(unitElement);
        }
        break;
      }
    }
  }, [currentScreen, currentBattle, battleEventIndex, responsiveDimensions.mainGridCellSize]);
}
