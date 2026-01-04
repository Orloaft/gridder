import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations';
import { animateCleave, animateFireball, animateArrow, animateBuff, animateSimpleBuff, animateBloodStrike, createTileFlash } from '@/animations/skillAnimations';
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
  const { currentScreen, currentBattle, battleEventIndex, useDeterministicBattle } = useGameStore();
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
        console.log('[WaveTransition] Starting transition for wave', event.data.waveNumber);

        const { scrollDistance, duration, heroTransitions } = event.data;

        // Check if custom formation was applied (heroes already positioned correctly)
        const customFormationApplied = event.data.customFormationApplied;
        console.log('[WaveTransition] Animation check - customFormationApplied:', customFormationApplied);
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
          console.log('[WaveTransition] Using simulator transitions for hero movement');
          heroTransitions.forEach((transition: any) => {
            const unitCard = document.querySelector(`[data-unit-id="${transition.unitId}"]`);
            if (unitCard) {
              const unitWrapper = unitCard.parentElement;
              if (unitWrapper instanceof HTMLElement) {
                const fromLeft = transition.from.col * cellSize;
                const toLeft = transition.to.col * cellSize;
                const currentTop = transition.from.row * cellSize;

                console.log(`[WaveTransition] Hero ${transition.unitId} animating from (${transition.from.row},${transition.from.col}) to (${transition.to.row},${transition.to.col})`);

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
                      console.log(`[WaveTransition] Animation complete for hero`);
                    }
                  });
                }
              }
            }
          });
        } else if (customFormationApplied) {
          console.log('[WaveTransition] Skipping simulator transitions - custom formation already applied heroes to final positions');
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
        console.log('[WaveStart] Wave', event.data.waveNumber, 'of', event.data.totalWaves);

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
        console.log('[Move] Processing move event for', event.data.unitId, 'from', event.data.from, 'to', event.data.to);
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

            // Always log the first few moves to debug position issues
            const moveCount = document.querySelectorAll('[data-move-logged]').length;
            if (moveCount < 5) {
              unitWrapper.setAttribute('data-move-logged', 'true');
              console.log(`[Move Debug] Unit ${event.data.unitId}:`, {
                from: event.data.from,
                to: event.data.to,
                cellSize,
                fromPos: { x: fromX, y: fromY },
                toPos: { x: toX, y: toY },
                offset: { x: offsetX, y: offsetY }
              });
            }

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
          } else {
            console.warn('[Move] Unit wrapper not found or not HTMLElement');
          }
        } else {
          console.warn('[Move] Unit card not found for', event.data.unitId);
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
        if (!caster || !caster.isAlive) {
          console.log('[AbilityUsed] Caster not found or dead:', event.data.attackerId);
          break;
        }

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
        } else if (abilityId === 'frost_bolt' || abilityId === 'aimed_shot' ||
                   abilityId === 'rapid_fire' || abilityId === 'incinerate' ||
                   abilityId === 'armor_piercing_bolt' || abilityId === 'chain_lightning' ||
                   abilityId === 'void_arrow' || abilityId === 'acid_flask' ||
                   abilityId === 'dark_bolt') {
          // Generic projectile animation for ranged abilities
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
            // Find closest target using Chebyshev distance
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

            // Determine projectile color based on ability
            let projectileColor = '#FFD700'; // Default gold
            if (abilityId === 'frost_bolt') projectileColor = '#00BFFF'; // Ice blue
            else if (abilityId === 'incinerate') projectileColor = '#FF4500'; // Fire red
            else if (abilityId === 'chain_lightning') projectileColor = '#9370DB'; // Electric purple
            else if (abilityId === 'void_arrow') projectileColor = '#4B0082'; // Dark purple
            else if (abilityId === 'acid_flask') projectileColor = '#32CD32'; // Acid green
            else if (abilityId === 'dark_bolt') projectileColor = '#8B008B'; // Dark magenta

            // Flash the target tile with appropriate color
            createTileFlash(
              target.position,
              cellSize,
              gridContainer,
              projectileColor,
              0.4 // After projectile hits
            );

            const targetCard = document.querySelector(`[data-unit-id="${target.id}"]`);
            if (targetCard instanceof HTMLElement) {
              const targetWrapper = targetCard.parentElement;
              if (targetWrapper instanceof HTMLElement) {
                // Set global flag to indicate animation is playing
                window.__abilityAnimationPlaying = true;

                // Use arrow animation as base for projectiles
                const timeline = animateArrow(
                  casterWrapper,
                  targetWrapper,
                  caster.position,
                  target.position,
                  cellSize,
                  gridContainer,
                  projectileColor // Pass color to arrow animation
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
        } else if (abilityId === 'life_drain' || abilityId === 'death_bolt' ||
                   abilityId === 'bone_throw' || abilityId === 'poison_arrow' ||
                   abilityId === 'ice_shard' || abilityId === 'blood_curse' ||
                   abilityId === 'weakness_curse' || abilityId === 'firebolt') {
          // Enemy projectile abilities
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
            // Find closest target
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

            // Determine projectile color based on ability
            let projectileColor = '#8B008B'; // Default purple for enemy
            if (abilityId === 'life_drain') projectileColor = '#9400D3'; // Purple drain
            else if (abilityId === 'death_bolt') projectileColor = '#4B0082'; // Dark purple
            else if (abilityId === 'bone_throw') projectileColor = '#F5DEB3'; // Bone white
            else if (abilityId === 'poison_arrow') projectileColor = '#00FF00'; // Poison green
            else if (abilityId === 'ice_shard') projectileColor = '#00CED1'; // Ice cyan
            else if (abilityId === 'blood_curse') projectileColor = '#DC143C'; // Blood red
            else if (abilityId === 'weakness_curse') projectileColor = '#8B0000'; // Dark red
            else if (abilityId === 'firebolt') projectileColor = '#FF6347'; // Fire red

            // Flash the target tile
            createTileFlash(
              target.position,
              cellSize,
              gridContainer,
              projectileColor,
              0.4
            );

            const targetCard = document.querySelector(`[data-unit-id="${target.id}"]`);
            if (targetCard instanceof HTMLElement) {
              const targetWrapper = targetCard.parentElement;
              if (targetWrapper instanceof HTMLElement) {
                window.__abilityAnimationPlaying = true;

                const timeline = animateArrow(
                  casterWrapper,
                  targetWrapper,
                  caster.position,
                  target.position,
                  cellSize,
                  gridContainer,
                  projectileColor
                );

                timeline.eventCallback('onComplete', () => {
                  window.__abilityAnimationPlaying = false;
                });
              }
            }
          }
        } else if (abilityId === 'dark_curse' || abilityId === 'silence' ||
                   abilityId === 'disease_bite' || abilityId === 'acid_splash') {
          // Debuff abilities - show curse effect
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
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

            // Debuff color based on type
            let debuffColor = '#8B008B'; // Default purple
            if (abilityId === 'dark_curse') debuffColor = '#4B0082'; // Dark purple
            else if (abilityId === 'silence') debuffColor = '#FF1493'; // Pink for silence
            else if (abilityId === 'disease_bite') debuffColor = '#556B2F'; // Disease green
            else if (abilityId === 'acid_splash') debuffColor = '#ADFF2F'; // Acid green

            const targetCard = document.querySelector(`[data-unit-id="${target.id}"]`);
            if (targetCard instanceof HTMLElement) {
              // Create debuff visual effect
              animateSimpleBuff(targetCard, debuffColor, true); // true for debuff

              // Flash tile with debuff color
              createTileFlash(
                target.position,
                cellSize,
                gridContainer,
                debuffColor,
                0.2
              );
            }
          }
        } else if (abilityId === 'stone_form' || abilityId === 'freezing_aura') {
          // Self buff abilities
          let buffColor = '#808080'; // Gray for stone
          if (abilityId === 'freezing_aura') buffColor = '#00CED1'; // Cyan for freeze

          // Animate buff on caster
          animateSimpleBuff(casterCard, buffColor, false); // false for buff

          // For AoE effects like freezing aura, flash nearby tiles
          if (abilityId === 'freezing_aura') {
            const radius = 3;
            for (let r = -radius; r <= radius; r++) {
              for (let c = -radius; c <= radius; c++) {
                if (Math.abs(r) + Math.abs(c) <= radius) {
                  createTileFlash(
                    {
                      row: caster.position.row + r,
                      col: caster.position.col + c
                    },
                    cellSize,
                    gridContainer,
                    buffColor,
                    0.1 + (Math.abs(r) + Math.abs(c)) * 0.05 // Stagger timing
                  );
                }
              }
            }
          }
        } else if (abilityId === 'summon_undead' || abilityId === 'summon_imp' || abilityId === 'split') {
          // Summon abilities - create spawn effect
          const summonColor = '#9400D3'; // Purple for summons

          // Flash tiles around caster where summons will appear
          const positions = [
            { row: caster.position.row, col: caster.position.col + 1 },
            { row: caster.position.row, col: caster.position.col - 1 },
            { row: caster.position.row + 1, col: caster.position.col },
            { row: caster.position.row - 1, col: caster.position.col },
          ];

          positions.forEach((pos, index) => {
            createTileFlash(
              pos,
              cellSize,
              gridContainer,
              summonColor,
              0.2 + index * 0.1
            );
          });

          // Animate summoning circle effect on caster
          animateSimpleBuff(casterCard, summonColor, false);
        } else if (abilityId === 'void_blast' || abilityId === 'devastating_slam') {
          // AoE explosion abilities
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
            // Find closest target for center of AoE
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

            const explosionColor = abilityId === 'void_blast' ? '#4B0082' : '#8B4513'; // Purple or brown

            // Create explosion effect at target position
            const radius = 2;
            for (let r = -radius; r <= radius; r++) {
              for (let c = -radius; c <= radius; c++) {
                if (r * r + c * c <= radius * radius) {
                  createTileFlash(
                    {
                      row: target.position.row + r,
                      col: target.position.col + c
                    },
                    cellSize,
                    gridContainer,
                    explosionColor,
                    0.1 + Math.sqrt(r * r + c * c) * 0.1 // Expanding explosion
                  );
                }
              }
            }
          }
        } else if (abilityId === 'shadow_strike') {
          // Teleport + attack ability
          const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
          const aliveTargets = targets.filter(t => t.isAlive);

          if (aliveTargets.length > 0) {
            const target = aliveTargets[0]; // Get first target

            // Create shadow effect at original position
            createTileFlash(
              caster.position,
              cellSize,
              gridContainer,
              '#4B0082',
              0.1
            );

            // Create shadow effect at target position
            createTileFlash(
              target.position,
              cellSize,
              gridContainer,
              '#8B008B',
              0.3
            );

            // Animate attack after "teleport"
            setTimeout(() => {
              const targetCard = document.querySelector(`[data-unit-id="${target.id}"]`);
              if (targetCard instanceof HTMLElement) {
                animateDamage(targetCard);
              }
            }, 300);
          }
        } else if (abilityId === 'terrify') {
          // Fear AoE ability
          const fearColor = '#8B008B'; // Purple fear
          const radius = 2;

          // Create expanding fear wave
          for (let r = -radius; r <= radius; r++) {
            for (let c = -radius; c <= radius; c++) {
              if (Math.abs(r) + Math.abs(c) <= radius) {
                createTileFlash(
                  {
                    row: caster.position.row + r,
                    col: caster.position.col + c
                  },
                  cellSize,
                  gridContainer,
                  fearColor,
                  0.1 + (Math.abs(r) + Math.abs(c)) * 0.1
                );
              }
            }
          }
        } else if (abilityId === 'blood_ritual' || abilityId === 'unholy_heal') {
          // Enemy healing abilities
          const allies = caster.isHero ? currentBattle.heroes : currentBattle.enemies;
          const healTargets = allies.filter(a => a.isAlive);

          healTargets.forEach((ally, index) => {
            const allyCard = document.querySelector(`[data-unit-id="${ally.id}"]`);
            if (allyCard instanceof HTMLElement) {
              // Green healing effect
              setTimeout(() => {
                animateSimpleBuff(allyCard, '#00FF00', false);
              }, index * 100);
            }
          });

          // For blood ritual, also show damage on caster
          if (abilityId === 'blood_ritual') {
            animateDamage(casterCard);
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
