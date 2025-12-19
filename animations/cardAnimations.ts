// Grid occupant card animation utilities
import gsap from 'gsap';

/**
 * Card Entrance Animation
 * Duration: 0.4s
 * Effect: Scale in + fade in + slight bounce
 * IMPORTANT: Initial state is set immediately to prevent flash
 */
export function animateCardEntrance(
  cardElement: HTMLElement,
  delay = 0
): gsap.core.Timeline {
  const tl = gsap.timeline({ delay });

  // Set initial state IMMEDIATELY (no animation)
  gsap.set(cardElement, {
    scale: 0,
    opacity: 0,
    rotation: -10,
    immediateRender: true,
  });

  // Animate in
  tl.to(cardElement, {
    scale: 1,
    opacity: 1,
    rotation: 0,
    duration: 0.4,
    ease: 'back.out(1.7)', // Overshoot creates satisfying bounce
  });

  return tl;
}

/**
 * Stagger multiple cards entrance
 */
export function animateCardsEntrance(cardElements: HTMLElement[]): gsap.core.Timeline {
  const tl = gsap.timeline();

  cardElements.forEach((card, index) => {
    tl.add(animateCardEntrance(card, index * 0.1), 0);
  });

  return tl;
}

/**
 * Card Exit Animation
 * Duration: 0.3s
 * Effect: Scale out + fade out + rotation
 */
export function animateCardExit(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(cardElement, {
    scale: 0.8,
    opacity: 0,
    rotation: 10,
    y: -20, // Slight lift
    duration: 0.3,
    ease: 'power2.in',
  });

  return tl;
}

/**
 * Card Hover Animation
 * Duration: 0.2s
 * Effect: Lift + glow + scale
 */
export function animateCardHover(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(cardElement, {
    y: -8,
    scale: 1.05,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
    filter: 'brightness(1.2)',
    duration: 0.2,
    ease: 'power2.out',
  });

  return tl;
}

export function animateCardHoverOut(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(cardElement, {
    y: 0,
    scale: 1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    filter: 'brightness(1)',
    duration: 0.2,
    ease: 'power2.in',
  });

  return tl;
}

/**
 * Card Click Animation
 * Duration: 0.2s
 * Effect: Quick scale down then up ("press" effect)
 */
export function animateCardClick(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Press down
  tl.to(cardElement, {
    scale: 0.95,
    duration: 0.1,
    ease: 'power2.in',
  });

  // Release
  tl.to(cardElement, {
    scale: 1.05,
    duration: 0.1,
    ease: 'back.out(3)',
  });

  // Settle
  tl.to(cardElement, {
    scale: 1,
    duration: 0.1,
    ease: 'power2.out',
  });

  return tl;
}
