// Reward reveal GSAP animation functions
// Used by RewardRevealOverlay to animate victory splash, currency counters,
// item reveals with rarity-specific effects, and summary card

import gsap from 'gsap';
import { Rarity } from '@/types/core.types';
import { RARITY_HEX } from '@/utils/constants';

// ========================================
// Utility Animations
// ========================================

/**
 * Screen shake effect
 */
export function animateScreenShake(
  el: HTMLElement,
  intensity: number = 3,
  duration: number = 0.3
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const shakes = Math.floor(duration / 0.05);

  for (let i = 0; i < shakes; i++) {
    const x = (Math.random() - 0.5) * 2 * intensity;
    const y = (Math.random() - 0.5) * 2 * intensity;
    tl.to(el, { x, y, duration: 0.05, ease: 'none' });
  }

  tl.to(el, { x: 0, y: 0, duration: 0.05, ease: 'power2.out' });
  return tl;
}

/**
 * Animate a number counter rolling up
 */
export function animateCounter(
  el: HTMLElement,
  from: number,
  to: number,
  duration: number = 1
): gsap.core.Tween {
  const obj = { value: from };
  return gsap.to(obj, {
    value: to,
    duration,
    ease: 'power2.out',
    snap: { value: 1 },
    onUpdate: () => {
      el.textContent = Math.floor(obj.value).toLocaleString();
    },
  });
}

/**
 * Create and animate DOM-based particles from a position
 */
function spawnParticles(
  container: HTMLElement,
  count: number,
  x: number,
  y: number,
  color: string,
  options: {
    spread?: number;
    size?: number;
    duration?: number;
    spiral?: boolean;
  } = {}
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const { spread = 150, size = 6, duration = 0.8, spiral = false } = options;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color};
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      z-index: 10;
    `;
    container.appendChild(particle);

    const angle = (i / count) * Math.PI * 2;
    const distance = spread * (0.5 + Math.random() * 0.5);
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance;

    if (spiral) {
      tl.to(
        particle,
        {
          x: targetX,
          y: targetY,
          rotation: 360 + Math.random() * 360,
          opacity: 0,
          scale: 0.2,
          duration: duration + Math.random() * 0.3,
          ease: 'power2.out',
          onComplete: () => particle.remove(),
        },
        0
      );
    } else {
      tl.to(
        particle,
        {
          x: targetX,
          y: targetY - 20, // slight upward drift
          opacity: 0,
          scale: 0.3,
          duration: duration + Math.random() * 0.3,
          ease: 'power2.out',
          onComplete: () => particle.remove(),
        },
        0
      );
    }
  }

  return tl;
}

// ========================================
// Phase 1: Victory Splash
// ========================================

/**
 * Animate the victory splash screen.
 * container must have child elements:
 *   [data-victory-text]     — the "VICTORY" text
 *   [data-victory-burst]    — radial light burst div
 *   [data-victory-particles]— container for particles
 */
export function animateVictorySplash(container: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  const textEl = container.querySelector('[data-victory-text]') as HTMLElement;
  const burstEl = container.querySelector('[data-victory-burst]') as HTMLElement;
  const particleContainer = container.querySelector('[data-victory-particles]') as HTMLElement;

  if (!textEl || !burstEl) return tl;

  // Overlay fade in
  tl.fromTo(container, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });

  // Light burst expands
  tl.fromTo(
    burstEl,
    { scale: 0, opacity: 0.8 },
    { scale: 1.5, opacity: 0, duration: 1.0, ease: 'power2.out' },
    0.1
  );

  // Text slam-drops in
  tl.fromTo(
    textEl,
    { y: -200, scale: 2.5, opacity: 0 },
    { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' },
    0.15
  );

  // Screen shake on impact
  tl.add(animateScreenShake(container, 4, 0.25), 0.55);

  // Particles burst outward
  if (particleContainer) {
    const rect = particleContainer.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    tl.add(spawnParticles(particleContainer, 20, cx, cy, '#FFD700', { spread: 200, duration: 1.0 }), 0.4);
  }

  return tl;
}

// ========================================
// Phase 2: Currency Reveal
// ========================================

/**
 * Animate currency counters and breakdown.
 * container must have child elements:
 *   [data-gold-section]     — gold section container
 *   [data-gold-counter]     — gold number text
 *   [data-gem-section]      — gem section container (optional)
 *   [data-gem-counter]      — gem number text (optional)
 *   [data-breakdown-item]   — breakdown items (multiple, in order)
 *   [data-xp-bar]           — XP progress bar fill (optional)
 */
export function animateCurrencyReveal(
  container: HTMLElement,
  goldTarget: number,
  gemTarget: number,
  breakdownData: { baseGold: number; waveMultiplier: number; medicalCosts: number }
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const goldSection = container.querySelector('[data-gold-section]') as HTMLElement;
  const goldCounter = container.querySelector('[data-gold-counter]') as HTMLElement;
  const gemSection = container.querySelector('[data-gem-section]') as HTMLElement;
  const gemCounter = container.querySelector('[data-gem-counter]') as HTMLElement;
  const breakdownItems = container.querySelectorAll('[data-breakdown-item]');
  const xpBar = container.querySelector('[data-xp-bar]') as HTMLElement;

  // Gold section slides in from left
  if (goldSection) {
    tl.fromTo(
      goldSection,
      { x: -100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
      0
    );
  }

  // Gold counter rolls up
  if (goldCounter) {
    tl.add(animateCounter(goldCounter, 0, goldTarget, 1.2), 0.3);
  }

  // Breakdown items stagger in
  breakdownItems.forEach((item, i) => {
    tl.fromTo(
      item,
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
      0.5 + i * 0.4
    );
  });

  // Gem section slides in from right (if present)
  if (gemSection && gemTarget > 0) {
    tl.fromTo(
      gemSection,
      { x: 100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
      0.2
    );

    if (gemCounter) {
      tl.add(animateCounter(gemCounter, 0, gemTarget, 0.8), 0.5);
    }
  }

  // XP bar fill
  if (xpBar) {
    tl.fromTo(
      xpBar,
      { scaleX: 0 },
      { scaleX: 1, duration: 1.0, ease: 'power2.out', transformOrigin: 'left center' },
      0.8
    );
  }

  return tl;
}

// ========================================
// Phase 3: Item Reveal
// ========================================

/**
 * Get rarity-specific animation configuration
 */
function getRarityConfig(rarity: Rarity): {
  color: string;
  particleCount: number;
  flashOpacity: number;
  flashDuration: number;
  shakeIntensity: number;
  pauseAfter: number;
  spiral: boolean;
} {
  const color = RARITY_HEX[rarity] || '#9CA3AF';

  switch (rarity) {
    case Rarity.Mythic:
      return { color, particleCount: 60, flashOpacity: 0.5, flashDuration: 0.3, shakeIntensity: 6, pauseAfter: 1.2, spiral: true };
    case Rarity.Legendary:
      return { color, particleCount: 40, flashOpacity: 0.5, flashDuration: 0.2, shakeIntensity: 4, pauseAfter: 0.8, spiral: false };
    case Rarity.Rare:
      return { color, particleCount: 20, flashOpacity: 0.3, flashDuration: 0.1, shakeIntensity: 2, pauseAfter: 0.5, spiral: false };
    case Rarity.Uncommon:
      return { color, particleCount: 10, flashOpacity: 0, flashDuration: 0, shakeIntensity: 0, pauseAfter: 0.3, spiral: false };
    default: // Common
      return { color, particleCount: 5, flashOpacity: 0, flashDuration: 0, shakeIntensity: 0, pauseAfter: 0.2, spiral: false };
  }
}

/**
 * Animate rarity-specific explosion at a position.
 * Creates expanding ring, particles, and screen flash.
 */
export function animateRarityExplosion(
  container: HTMLElement,
  rarity: Rarity,
  x: number,
  y: number
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const config = getRarityConfig(rarity);

  // Expanding ring
  const ring = document.createElement('div');
  ring.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid ${config.color};
    box-shadow: 0 0 20px ${config.color}, inset 0 0 20px ${config.color}40;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 10;
  `;
  container.appendChild(ring);

  tl.to(ring, {
    scale: 8,
    opacity: 0,
    duration: 0.5,
    ease: 'power2.out',
    onComplete: () => ring.remove(),
  });

  // Particles
  tl.add(
    spawnParticles(container, config.particleCount, x, y, config.color, {
      spread: 180,
      size: rarity === Rarity.Mythic ? 8 : 6,
      duration: 0.8,
      spiral: config.spiral,
    }),
    0
  );

  // Screen flash for Rare+
  if (config.flashOpacity > 0) {
    const flash = document.createElement('div');
    const flashColor = rarity === Rarity.Mythic
      ? 'linear-gradient(135deg, #EC4899, #8B5CF6, #3B82F6, #10B981, #F59E0B)'
      : config.color;
    flash.style.cssText = `
      position: absolute;
      inset: 0;
      background: ${flashColor};
      opacity: 0;
      pointer-events: none;
      z-index: 5;
    `;
    container.appendChild(flash);

    tl.to(flash, { opacity: config.flashOpacity, duration: 0.05, ease: 'none' }, 0);
    tl.to(flash, {
      opacity: 0,
      duration: config.flashDuration,
      ease: 'power2.out',
      onComplete: () => flash.remove(),
    });
  }

  // Screen shake for Rare+
  if (config.shakeIntensity > 0) {
    tl.add(animateScreenShake(container, config.shakeIntensity, 0.2), 0);
  }

  // Extra Mythic: rotating rays
  if (rarity === Rarity.Mythic) {
    const rays = document.createElement('div');
    rays.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 300px;
      height: 300px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 8;
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        ${config.color}40 10deg,
        transparent 20deg,
        transparent 40deg,
        ${config.color}40 50deg,
        transparent 60deg,
        transparent 80deg,
        ${config.color}40 90deg,
        transparent 100deg,
        transparent 120deg,
        ${config.color}40 130deg,
        transparent 140deg,
        transparent 160deg,
        ${config.color}40 170deg,
        transparent 180deg,
        transparent 200deg,
        ${config.color}40 210deg,
        transparent 220deg,
        transparent 240deg,
        ${config.color}40 250deg,
        transparent 260deg,
        transparent 280deg,
        ${config.color}40 290deg,
        transparent 300deg,
        transparent 320deg,
        ${config.color}40 330deg,
        transparent 340deg,
        transparent 360deg
      );
      border-radius: 50%;
    `;
    container.appendChild(rays);

    tl.fromTo(
      rays,
      { rotation: 0, scale: 0.5, opacity: 0.8 },
      { rotation: 180, scale: 2, opacity: 0, duration: 1.2, ease: 'power2.out', onComplete: () => rays.remove() },
      0
    );
  }

  // Legendary: starburst beams
  if (rarity === Rarity.Legendary) {
    for (let i = 0; i < 6; i++) {
      const beam = document.createElement('div');
      const angle = (i / 6) * 360;
      beam.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 3px;
        height: 80px;
        background: linear-gradient(to bottom, ${config.color}, transparent);
        transform-origin: top center;
        transform: translate(-50%, 0) rotate(${angle}deg);
        pointer-events: none;
        z-index: 8;
      `;
      container.appendChild(beam);

      tl.fromTo(
        beam,
        { scaleY: 0, opacity: 1 },
        { scaleY: 1.5, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => beam.remove() },
        0.05
      );
    }
  }

  return tl;
}

/**
 * Animate a single item reveal: orb anticipation → explosion → fly to grid.
 * orbEl: the orb element (already in DOM)
 * itemIconEl: the item icon element that flies to grid (already in DOM, hidden)
 * rarity: item rarity for effect intensity
 * targetX, targetY: grid cell position (relative to overlay)
 * overlayContainer: the overlay root for spawning effects
 */
export function animateItemReveal(
  orbEl: HTMLElement,
  itemIconEl: HTMLElement,
  rarity: Rarity,
  targetX: number,
  targetY: number,
  overlayContainer: HTMLElement
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const config = getRarityConfig(rarity);
  const color = config.color;

  // Get orb center position
  const orbRect = orbEl.getBoundingClientRect();
  const containerRect = overlayContainer.getBoundingClientRect();
  const orbCenterX = orbRect.left - containerRect.left + orbRect.width / 2;
  const orbCenterY = orbRect.top - containerRect.top + orbRect.height / 2;

  // Phase 1: Anticipation — orb pulses and grows
  tl.to(orbEl, {
    scale: 1.3,
    duration: 0.2,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: 1,
  });

  // Set orb color glow
  tl.to(orbEl, {
    boxShadow: `0 0 40px ${color}, 0 0 80px ${color}80`,
    borderColor: color,
    duration: 0.3,
    ease: 'power2.in',
  }, 0);

  // Phase 2: Explosion — orb bursts
  tl.to(orbEl, {
    scale: 0,
    opacity: 0,
    duration: 0.15,
    ease: 'power2.in',
  });

  // Rarity explosion
  tl.add(animateRarityExplosion(overlayContainer, rarity, orbCenterX, orbCenterY), '-=0.1');

  // Phase 3: Item icon appears and flies to grid position
  tl.set(itemIconEl, {
    opacity: 1,
    scale: 1.5,
    x: orbCenterX - targetX,
    y: orbCenterY - targetY,
  });

  tl.to(itemIconEl, {
    x: 0,
    y: 0,
    scale: 1,
    duration: 0.5,
    ease: 'power2.out',
  });

  // Trail effect while flying
  const trailCount = 5;
  for (let i = 0; i < trailCount; i++) {
    const trail = document.createElement('div');
    trail.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${color};
      opacity: 0;
      pointer-events: none;
      z-index: 5;
      left: ${orbCenterX}px;
      top: ${orbCenterY}px;
    `;
    overlayContainer.appendChild(trail);

    const progress = i / trailCount;
    const trailX = orbCenterX + (targetX - orbCenterX) * progress;
    const trailY = orbCenterY + (targetY - orbCenterY) * progress;

    tl.fromTo(
      trail,
      { left: orbCenterX, top: orbCenterY, opacity: 0.6 },
      {
        left: trailX,
        top: trailY,
        opacity: 0,
        scale: 0.3,
        duration: 0.4,
        delay: i * 0.05,
        ease: 'power2.out',
        onComplete: () => trail.remove(),
      },
      '-=0.5'
    );
  }

  return tl;
}

// ========================================
// Phase 4: Summary
// ========================================

/**
 * Animate summary card sliding up from bottom
 */
export function animateSummaryEntrance(card: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.fromTo(
    card,
    { y: 300, opacity: 0, scale: 0.9 },
    { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)' }
  );

  return tl;
}

/**
 * Animate the full overlay exit (used when continuing)
 */
export function animateRewardExit(overlay: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(overlay, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in',
  });

  return tl;
}
