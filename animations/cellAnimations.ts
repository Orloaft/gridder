// Grid cell animation utilities
import gsap from 'gsap';

/**
 * Cell Hover Animation
 * Duration: 0.15s
 * Effect: Subtle glow + scale
 */
export function animateCellHover(cellElement: HTMLElement): gsap.core.Tween {
  return gsap.to(cellElement, {
    scale: 1.05,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    boxShadow: '0 0 20px rgba(79, 195, 247, 0.4)',
    duration: 0.15,
    ease: 'power2.out',
  });
}

export function animateCellHoverOut(cellElement: HTMLElement): gsap.core.Tween {
  return gsap.to(cellElement, {
    scale: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    boxShadow: '0 0 0 rgba(79, 195, 247, 0)',
    duration: 0.15,
    ease: 'power2.in',
  });
}

/**
 * Cell Selection Animation
 * Duration: 0.3s
 * Effect: Pulse + border glow
 */
export function animateCellSelect(cellElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Initial pulse
  tl.to(cellElement, {
    scale: 1.1,
    duration: 0.15,
    ease: 'back.out(2)',
  });

  // Return to slightly elevated
  tl.to(cellElement, {
    scale: 1.05,
    duration: 0.15,
    ease: 'power2.in',
  });

  // Continuous pulse for selected state
  tl.to(
    cellElement,
    {
      boxShadow: '0 0 30px rgba(76, 175, 80, 0.8)',
      duration: 0.8,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    },
    0
  ); // Start at time 0 (parallel with other animations)

  return tl;
}

export function animateCellDeselect(cellElement: HTMLElement): gsap.core.Tween {
  // Kill any ongoing animations first
  gsap.killTweensOf(cellElement);

  return gsap.to(cellElement, {
    scale: 1,
    boxShadow: '0 0 0 rgba(76, 175, 80, 0)',
    duration: 0.2,
    ease: 'power2.out',
  });
}

/**
 * Cell Highlight Animation (for valid move targets, etc.)
 * Duration: Continuous pulse
 * Effect: Gentle pulsing glow
 */
export function animateCellHighlight(
  cellElement: HTMLElement,
  color = '#FFD700'
): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1 });

  tl.to(cellElement, {
    backgroundColor: `${color}33`, // 33 = 20% opacity in hex
    boxShadow: `0 0 15px ${color}66`,
    duration: 0.8,
    ease: 'sine.inOut',
  });

  tl.to(cellElement, {
    backgroundColor: `${color}11`,
    boxShadow: `0 0 5px ${color}33`,
    duration: 0.8,
    ease: 'sine.inOut',
  });

  return tl;
}

export function stopCellHighlight(cellElement: HTMLElement): gsap.core.Tween {
  gsap.killTweensOf(cellElement);

  return gsap.to(cellElement, {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
    duration: 0.2,
    ease: 'power2.out',
  });
}
