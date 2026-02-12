import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/types/battle.types';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations';
import { playAbilityAnimation } from '@/animations/abilityAnimationRegistry';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import gsap from 'gsap';

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
    // V2 deterministic system works WITH existing animations
    // The V2 system generates standard BattleEvents that this hook animates normally

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
      case BattleEventType.WaveTransition: {
        // Wave transition - EVERYTHING scrolls left together
        const { scrollDistance, duration, heroTransitions } = event.data;

        // Check if custom formation was applied (heroes already positioned correctly)
        const customFormationApplied = event.data.customFormationApplied;
        const cellSize = responsiveDimensions.mainGridCellSize;

        // Convert scroll distance from grid cells to pixels
        const scrollPixels = scrollDistance * cellSize;

        // Trigger background scroll
        window.dispatchEvent(new CustomEvent('waveTransition', {
          detail: {
            waveNumber: event.data.waveNumber,
            scrollDistance: scrollPixels,
            duration
          }
        }));

        // If we have specific hero transitions, use them (unless custom formation was applied)
        if (heroTransitions && !customFormationApplied) {
          heroTransitions.forEach((transition: any) => {
            const unitCard = document.querySelector(`[data-unit-id="${transition.unitId}"]`);
            if (unitCard) {
              const unitWrapper = unitCard.parentElement;
              if (unitWrapper instanceof HTMLElement) {
                const fromLeft = transition.from.col * cellSize;
                const toLeft = transition.to.col * cellSize;
                const currentTop = transition.from.row * cellSize;

                // Only animate if there's actual movement
                if (fromLeft !== toLeft) {
                  // First, position the element at the "from" position
                  gsap.set(unitWrapper, {
                    left: fromLeft,
                    top: currentTop
                  });

                  // Then animate to the "to" position
                  gsap.to(unitWrapper, {
                    left: toLeft,
                    top: currentTop,
                    duration: duration / 1000,
                    ease: 'ease-in-out',
                    onComplete: () => {
                    }
                  });
                }
              }
            }
          });
        } else if (customFormationApplied) {
        } else {
          // Fallback: calculate positions for older events
          const allUnits = [...currentBattle.heroes, ...currentBattle.enemies].filter(u => u.isAlive);

          allUnits.forEach(unit => {
            const unitCard = document.querySelector(`[data-unit-id="${unit.id}"]`);
            if (unitCard) {
              const unitWrapper = unitCard.parentElement;
              if (unitWrapper instanceof HTMLElement) {
                const isHero = currentBattle.heroes.some(h => h.id === unit.id);

                let fromCol: number;
                let toCol: number;

                if (isHero) {
                  toCol = unit.position.col;
                  fromCol = Math.min(7, toCol + scrollDistance + 1);
                } else {
                  fromCol = unit.position.col;
                  toCol = unit.position.col;
                }

                const fromLeft = fromCol * cellSize;
                const toLeft = toCol * cellSize;
                const currentTop = unit.position.row * cellSize;

                if (fromLeft !== toLeft) {
                  gsap.set(unitWrapper, {
                    left: fromLeft,
                    top: currentTop
                  });

                  gsap.to(unitWrapper, {
                    left: toLeft,
                    top: currentTop,
                    duration: duration / 1000,
                    ease: 'ease-in-out'
                  });
                }
              }
            }
          });
        }

        break;
      }

      case BattleEventType.WaveStart: {
        // Animate new wave of enemies sliding in from the right
        event.data.enemies.forEach((enemyData: any, index: number) => {
          const unitCard = document.querySelector(`[data-unit-id="${enemyData.unitId}"]`);
          if (unitCard) {
            const unitWrapper = unitCard.parentElement;
            if (unitWrapper instanceof HTMLElement) {
              const cellSize = responsiveDimensions.mainGridCellSize;
              // Enemies slide in from off-screen to their grid positions
              // No scroll adjustment needed since grid positions are absolute
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
        const unitCard = document.querySelector(`[data-unit-id="${event.data.unitId}"]`);
        if (unitCard) {
          const unitWrapper = unitCard.parentElement;
          if (unitWrapper instanceof HTMLElement) {
            const cellSize = responsiveDimensions.mainGridCellSize;

            // IMPORTANT: The logical position has already been updated to "to"
            // But we need to keep the visual position at "from" until the animation plays
            const fromX = event.data.from.col * cellSize;
            const fromY = event.data.from.row * cellSize;
            const toX = event.data.to.col * cellSize;
            const toY = event.data.to.row * cellSize;

            // The element is now positioned at "to" because React re-rendered
            // We need to move it back to "from" using transforms
            const offsetX = fromX - toX;
            const offsetY = fromY - toY;

            // First, clear any existing transforms to start fresh
            gsap.set(unitWrapper, { clearProps: "transform" });

            // Instantly move the element back to "from" position using transform
            // This counteracts React's positioning at "to"
            gsap.set(unitWrapper, {
              x: offsetX,
              y: offsetY,
              immediateRender: true
            });

            // Force a reflow to ensure the transform is applied before animation
            void unitWrapper.offsetHeight;

            // Now animate from the offset position back to (0,0)
            // This creates the visual movement from "from" to "to"
            setTimeout(() => {
              animateTileSlide(
                unitWrapper,
                event.data.from,
                event.data.to,
                cellSize,
                0.3
              );
            }, 10); // Small delay to ensure transform is set
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
        // Find caster unit in battle state
        const caster = [...currentBattle.heroes, ...currentBattle.enemies].find(
          u => u.id === event.data.attackerId
        );
        if (!caster || !caster.isAlive) break;

        const cellSize = responsiveDimensions.mainGridCellSize;

        // Use the animation registry to play the appropriate animation
        const timeline = playAbilityAnimation({
          abilityId: event.data.abilityId,
          caster,
          heroes: currentBattle.heroes,
          enemies: currentBattle.enemies,
          cellSize,
        });

        // If the animation returns a timeline, gate auto-advance on its completion
        if (timeline) {
          window.__abilityAnimationPlaying = true;
          timeline.eventCallback('onComplete', () => {
            window.__abilityAnimationPlaying = false;
          });
        }
        break;
      }
    }
  }, [currentScreen, currentBattle, battleEventIndex, responsiveDimensions.mainGridCellSize]);
}
