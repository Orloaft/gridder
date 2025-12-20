import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations';
import { animateCleave, animateFireball, animateBuff } from '@/animations/skillAnimations';
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

      case BattleEventType.AbilityUsed: {
        // Animate ability usage
        const casterElement = document.querySelector(`[data-unit-id="${event.data.attackerId}"]`);
        if (!casterElement || !(casterElement instanceof HTMLElement)) break;

        // Get the grid container for creating effect elements
        const gridContainer = document.querySelector('.grid-container');
        if (!gridContainer || !(gridContainer instanceof HTMLElement)) break;

        const cellSize = responsiveDimensions.mainGridCellSize;

        // Find caster unit in battle state to get position
        const caster = [...currentBattle.heroes, ...currentBattle.enemies].find(
          u => u.id === event.data.attackerId
        );
        if (!caster) break;

        // Determine animation based on ability ID
        const abilityId = event.data.abilityId;

        if (abilityId === 'blade_cleave') {
          // Find all enemies for AOE targeting
          const enemyPositions = currentBattle.enemies
            .filter(e => e.isAlive)
            .map(e => e.position);

          animateCleave(
            casterElement,
            enemyPositions,
            caster.position,
            cellSize,
            gridContainer
          );
        } else if (abilityId === 'fireball') {
          // Find the closest enemy
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);
          if (aliveTargets.length > 0) {
            const target = aliveTargets[0]; // Use first alive target
            const targetElement = document.querySelector(`[data-unit-id="${target.id}"]`);
            if (targetElement instanceof HTMLElement) {
              animateFireball(
                casterElement,
                targetElement,
                caster.position,
                target.position,
                cellSize,
                gridContainer
              );
            }
          }
        } else if (abilityId === 'rallying_cry') {
          // Find all allied heroes
          const allies = caster.isHero ? currentBattle.heroes : currentBattle.enemies;
          const allyElements = allies
            .filter(a => a.isAlive)
            .map(a => document.querySelector(`[data-unit-id="${a.id}"]`))
            .filter(el => el instanceof HTMLElement) as HTMLElement[];

          animateBuff(
            casterElement,
            allyElements,
            caster.position,
            cellSize,
            gridContainer,
            '#4CAF50' // Green for rallying cry
          );
        }
        break;
      }
    }
  }, [currentScreen, currentBattle, battleEventIndex, responsiveDimensions.mainGridCellSize]);
}
