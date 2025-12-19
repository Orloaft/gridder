// Screen transition animation utilities
import gsap from 'gsap';

/**
 * Screen Fade In
 * Duration: 0.3s
 * Effect: Fade in from below
 * IMPORTANT: Initial state is set immediately to prevent flash
 */
export function animateScreenFadeIn(screenElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Set initial state IMMEDIATELY
  gsap.set(screenElement, {
    opacity: 0,
    y: 20,
    immediateRender: true,
  });

  tl.to(screenElement, {
    opacity: 1,
    y: 0,
    duration: 0.3,
    ease: 'power2.out',
  });

  return tl;
}

/**
 * Screen Fade Out
 * Duration: 0.2s
 * Effect: Fade out upward
 */
export function animateScreenFadeOut(screenElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(screenElement, {
    opacity: 0,
    y: -20,
    duration: 0.2,
    ease: 'power2.in',
  });

  return tl;
}

/**
 * Screen Shake
 * Duration: 0.15s
 * Effect: Shake for impact feedback
 */
export function animateScreenShake(
  containerElement: HTMLElement,
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const shakeAmount = {
    light: 2,
    medium: 5,
    heavy: 10,
  }[intensity];

  // Save original position
  const originalX = (gsap.getProperty(containerElement, 'x') as number) || 0;
  const originalY = (gsap.getProperty(containerElement, 'y') as number) || 0;

  // Shake in random directions
  for (let i = 0; i < 5; i++) {
    tl.to(containerElement, {
      x: originalX + (Math.random() - 0.5) * shakeAmount * 2,
      y: originalY + (Math.random() - 0.5) * shakeAmount * 2,
      duration: 0.03,
      ease: 'power2.inOut',
    });
  }

  // Return to original position
  tl.to(containerElement, {
    x: originalX,
    y: originalY,
    duration: 0.05,
    ease: 'power2.out',
  });

  return tl;
}
