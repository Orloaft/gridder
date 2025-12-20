import gsap from 'gsap';
import { GridPosition } from '@/types/grid.types';

/**
 * Clamp grid position to valid bounds (0-7)
 */
function clampGridPosition(position: GridPosition): GridPosition {
  return {
    row: Math.max(0, Math.min(7, position.row)),
    col: Math.max(0, Math.min(7, position.col)),
  };
}

/**
 * Animates a tile sliding from one grid position to another
 * Uses CSS transforms for smooth, hardware-accelerated diagonal movement
 * @param element - The DOM element to animate
 * @param fromPosition - Starting grid position
 * @param toPosition - Ending grid position
 * @param cellSize - Size of each grid cell in pixels
 * @param duration - Animation duration in seconds
 * @param onComplete - Callback when animation finishes
 */
export function animateTileSlide(
  element: HTMLElement,
  fromPosition: GridPosition,
  toPosition: GridPosition,
  cellSize: number,
  duration: number = 0.5,
  onComplete?: () => void
): void {
  // Clamp positions to ensure they're within grid bounds (0-7)
  const clampedFrom = clampGridPosition(fromPosition);
  const clampedTo = clampGridPosition(toPosition);

  const fromX = clampedFrom.col * cellSize;
  const fromY = clampedFrom.row * cellSize;
  const toX = clampedTo.col * cellSize;
  const toY = clampedTo.row * cellSize;

  // Calculate the delta for transform-based animation
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;

  // First, ensure the element is at the starting position
  gsap.set(element, {
    left: fromX,
    top: fromY,
    x: 0,
    y: 0,
  });

  // Then animate using transforms for smooth diagonal movement
  // Transforms are hardware-accelerated and guarantee simultaneous X/Y movement
  gsap.to(element, {
    x: deltaX,
    y: deltaY,
    duration,
    ease: 'power2.inOut',
    onComplete: () => {
      // After animation completes, update position and reset transform
      // This prevents transform accumulation on subsequent moves
      gsap.set(element, {
        left: toX,
        top: toY,
        x: 0,
        y: 0,
      });
      onComplete?.();
    },
  });
}

/**
 * Animates a quick attack motion (dash forward and back)
 * @param element - The attacking unit's DOM element
 * @param direction - 'left' or 'right' for attack direction
 * @param onComplete - Callback when animation finishes
 */
export function animateAttack(
  element: HTMLElement,
  direction: 'left' | 'right',
  onComplete?: () => void
): void {
  const distance = direction === 'left' ? -30 : 30;

  const tl = gsap.timeline({
    onComplete,
  });

  // Quick dash forward
  tl.to(element, {
    x: distance,
    duration: 0.15,
    ease: 'power2.out',
  });

  // Return to original position
  tl.to(element, {
    x: 0,
    duration: 0.2,
    ease: 'power2.in',
  });
}

/**
 * Animates damage taken (shake effect)
 * @param element - The unit taking damage
 * @param onComplete - Callback when animation finishes
 */
export function animateDamage(
  element: HTMLElement,
  onComplete?: () => void
): void {
  gsap.fromTo(
    element,
    { x: -5 },
    {
      x: 5,
      duration: 0.05,
      repeat: 5,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.set(element, { x: 0 });
        onComplete?.();
      },
    }
  );
}

/**
 * Animates unit death (fade out and scale down)
 * @param element - The dying unit's DOM element
 * @param onComplete - Callback when animation finishes
 */
export function animateDeath(
  element: HTMLElement,
  onComplete?: () => void
): void {
  gsap.to(element, {
    opacity: 0,
    scale: 0.5,
    rotation: -15,
    duration: 0.4,
    ease: 'power2.in',
    onComplete,
  });
}
