// Button animation utilities
import gsap from 'gsap';

/**
 * Button Press Animation
 * Duration: 0.2s
 * Effect: Press down, release with bounce
 */
export function animateButtonPress(buttonElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Press down
  tl.to(buttonElement, {
    scale: 0.95,
    y: 2,
    duration: 0.1,
    ease: 'power2.in',
  });

  // Release with bounce
  tl.to(buttonElement, {
    scale: 1,
    y: 0,
    duration: 0.1,
    ease: 'back.out(3)',
  });

  return tl;
}

/**
 * Button Hover Animation
 * Duration: 0.15s
 * Effect: Lift, scale, glow
 */
export function animateButtonHover(buttonElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(buttonElement, {
    scale: 1.05,
    y: -2,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
    filter: 'brightness(1.1)',
    duration: 0.15,
    ease: 'power2.out',
  });

  return tl;
}

export function animateButtonHoverOut(buttonElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(buttonElement, {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    filter: 'brightness(1)',
    duration: 0.15,
    ease: 'power2.in',
  });

  return tl;
}

/**
 * Button Disabled Animation
 * Effect: Fade out and reduce opacity
 */
export function animateButtonDisable(buttonElement: HTMLElement): gsap.core.Tween {
  return gsap.to(buttonElement, {
    opacity: 0.5,
    filter: 'grayscale(0.5)',
    duration: 0.2,
    ease: 'power2.out',
  });
}

export function animateButtonEnable(buttonElement: HTMLElement): gsap.core.Tween {
  return gsap.to(buttonElement, {
    opacity: 1,
    filter: 'grayscale(0)',
    duration: 0.2,
    ease: 'power2.out',
  });
}
