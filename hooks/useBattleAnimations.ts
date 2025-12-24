import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations';
import { animateCleave, animateFireball, animateArrow, animateBuff, animateBloodStrike, createTileFlash } from '@/animations/skillAnimations';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

// Global flags to track if animations are currently playing
declare global {
  interface Window {
    __abilityAnimationPlaying?: boolean;
    __tileAnimationPlaying?: boolean;
  }
}

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
      case BattleEventType.WaveStart: {
        // Animate new wave of enemies sliding in from the right
        console.log('[WaveStart] Wave', event.data.waveNumber, 'of', event.data.totalWaves);

        event.data.enemies.forEach((enemyData: any, index: number) => {
          const unitCard = document.querySelector(`[data-unit-id="${enemyData.unitId}"]`);
          if (unitCard) {
            const unitWrapper = unitCard.parentElement;
            if (unitWrapper instanceof HTMLElement) {
              const cellSize = responsiveDimensions.mainGridCellSize;
              // Stagger the animations slightly for visual effect
              setTimeout(() => {
                animateTileSlide(
                  unitWrapper,
                  enemyData.fromPosition, // Starting position (col: 8, off-screen right)
                  enemyData.toPosition,   // Final grid position
                  cellSize,
                  0.5 // Duration
                );
              }, index * 100); // 100ms stagger between each enemy
            }
          }
        });
        break;
      }

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
        const casterCard = document.querySelector(`[data-unit-id="${event.data.attackerId}"]`);
        if (!casterCard || !(casterCard instanceof HTMLElement)) {
          console.log('[AbilityUsed] Caster card not found:', event.data.attackerId);
          break;
        }

        // Get the parent wrapper element (has position styles)
        const casterWrapper = casterCard.parentElement;
        if (!casterWrapper || !(casterWrapper instanceof HTMLElement)) {
          console.log('[AbilityUsed] Caster wrapper not found');
          break;
        }

        // Get the grid container for creating effect elements (parent of wrapper)
        const gridContainer = casterWrapper.parentElement;
        if (!gridContainer || !(gridContainer instanceof HTMLElement)) {
          console.log('[AbilityUsed] Grid container not found');
          break;
        }

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

          console.log('[Blade Cleave Animation]', {
            casterWrapper,
            enemyPositions,
            casterPosition: caster.position,
            cellSize,
            gridContainer
          });

          // Create tile flash highlights for enemy positions
          enemyPositions.forEach((pos, index) => {
            createTileFlash(
              pos,
              cellSize,
              gridContainer,
              '#FFD700', // Gold color for cleave
              0.25 + (index * 0.03) // Stagger timing with slash animation
            );
          });

          animateCleave(
            casterWrapper,
            enemyPositions,
            caster.position,
            cellSize,
            gridContainer
          );
        } else if (abilityId === 'fireball') {
          // Find the closest enemy target (Chebyshev distance)
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
            // Find closest target using Chebyshev distance (same as combat system)
            const target = aliveTargets.reduce((closest, current) => {
              const closestDist = Math.max(
                Math.abs(caster.position.col - closest.position.col),
                Math.abs(caster.position.row - closest.position.row)
              );
              const currentDist = Math.max(
                Math.abs(caster.position.col - current.position.col),
                Math.abs(caster.position.row - current.position.row)
              );
              return currentDist < closestDist ? current : closest;
            });

            // Calculate all tiles affected by fireball AOE (2x2 area)
            // AOE radius of 1 with Chebyshev distance creates a 3x3 area
            // For a 2x2 area, we need radius of 0 (just the 4 tiles around impact point)
            const affectedTiles: { row: number; col: number }[] = [
              target.position, // Center tile
              { row: target.position.row + 1, col: target.position.col }, // Below
              { row: target.position.row, col: target.position.col + 1 }, // Right
              { row: target.position.row + 1, col: target.position.col + 1 }, // Bottom-right
            ].filter(pos => pos.row >= 0 && pos.row <= 7 && pos.col >= 0 && pos.col <= 7); // Keep only valid tiles

            // Create tile flash highlights with delays
            affectedTiles.forEach((tilePos, index) => {
              const isTargetTile = tilePos.row === target.position.row && tilePos.col === target.position.col;
              const delay = 0.6 + (index * 0.01); // Start after fireball travels (0.6s)
              createTileFlash(
                tilePos,
                cellSize,
                gridContainer,
                isTargetTile ? '#FFFFFF' : '#FF4500', // White for target, orange for AOE
                delay
              );
            });

            const targetCard = document.querySelector(`[data-unit-id="${target.id}"]`);
            if (targetCard instanceof HTMLElement) {
              const targetWrapper = targetCard.parentElement;
              if (targetWrapper instanceof HTMLElement) {
                // Set global flag to indicate animation is playing
                window.__abilityAnimationPlaying = true;

                const timeline = animateFireball(
                  casterWrapper,
                  targetWrapper,
                  caster.position,
                  target.position,
                  cellSize,
                  gridContainer
                );

                // Clear flag when animation completes
                timeline.eventCallback('onComplete', () => {
                  window.__abilityAnimationPlaying = false;
                });
              }
            }
          }
        } else if (abilityId === 'precise_shot') {
          // Find the closest enemy target (Chebyshev distance)
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
            // Find closest target using Chebyshev distance (same as combat system)
            const target = aliveTargets.reduce((closest, current) => {
              const closestDist = Math.max(
                Math.abs(caster.position.col - closest.position.col),
                Math.abs(caster.position.row - closest.position.row)
              );
              const currentDist = Math.max(
                Math.abs(caster.position.col - current.position.col),
                Math.abs(caster.position.row - current.position.row)
              );
              return currentDist < closestDist ? current : closest;
            });

            // Flash the target tile
            createTileFlash(
              target.position,
              cellSize,
              gridContainer,
              '#FFD700', // Gold color for arrow
              0.4 // After arrow is drawn
            );

            const targetCard = document.querySelector(`[data-unit-id="${target.id}"]`);
            if (targetCard instanceof HTMLElement) {
              const targetWrapper = targetCard.parentElement;
              if (targetWrapper instanceof HTMLElement) {
                // Set global flag to indicate animation is playing
                window.__abilityAnimationPlaying = true;

                const timeline = animateArrow(
                  casterWrapper,
                  targetWrapper,
                  caster.position,
                  target.position,
                  cellSize,
                  gridContainer
                );

                // Clear flag when animation completes
                timeline.eventCallback('onComplete', () => {
                  window.__abilityAnimationPlaying = false;
                });
              }
            }
          }
        } else if (abilityId === 'blood_strike') {
          // Find the closest enemy target (Chebyshev distance)
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
            // Find closest target using Chebyshev distance (same as combat system)
            const target = aliveTargets.reduce((closest, current) => {
              const closestDist = Math.max(
                Math.abs(caster.position.col - closest.position.col),
                Math.abs(caster.position.row - closest.position.row)
              );
              const currentDist = Math.max(
                Math.abs(caster.position.col - current.position.col),
                Math.abs(caster.position.row - current.position.row)
              );
              return currentDist < closestDist ? current : closest;
            });

            const targetCard = document.querySelector(`[data-unit-id="${target.id}"]`);
            if (targetCard instanceof HTMLElement) {
              const targetWrapper = targetCard.parentElement;
              if (targetWrapper instanceof HTMLElement) {
                // Set global flag to indicate animation is playing
                window.__abilityAnimationPlaying = true;

                const timeline = animateBloodStrike(
                  casterWrapper,
                  targetWrapper,
                  caster.position,
                  target.position,
                  cellSize,
                  gridContainer
                );

                // Clear flag when animation completes
                timeline.eventCallback('onComplete', () => {
                  window.__abilityAnimationPlaying = false;
                });
              }
            }
          }
        } else if (abilityId === 'mass_heal') {
          // Find all allied heroes for healing animation
          const allies = caster.isHero ? currentBattle.heroes : currentBattle.enemies;
          const allyWrappers = allies
            .filter(a => a.isAlive)
            .map(a => {
              const card = document.querySelector(`[data-unit-id="${a.id}"]`);
              return card?.parentElement;
            })
            .filter(el => el instanceof HTMLElement) as HTMLElement[];

          animateBuff(
            casterWrapper,
            allyWrappers,
            caster.position,
            cellSize,
            gridContainer,
            '#00FF00' // Bright green for healing
          );
        } else if (abilityId === 'rallying_cry') {
          // Find all allied heroes
          const allies = caster.isHero ? currentBattle.heroes : currentBattle.enemies;
          const allyWrappers = allies
            .filter(a => a.isAlive)
            .map(a => {
              const card = document.querySelector(`[data-unit-id="${a.id}"]`);
              return card?.parentElement;
            })
            .filter(el => el instanceof HTMLElement) as HTMLElement[];

          animateBuff(
            casterWrapper,
            allyWrappers,
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
