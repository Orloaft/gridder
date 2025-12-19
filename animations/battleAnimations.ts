// Battle animation utilities
import gsap from 'gsap';
import { GridPosition } from '@/types/grid.types';

/**
 * Calculate pixel position from grid position
 */
export function calculatePixelPosition(
  gridPosition: GridPosition,
  cellSize: number
): { x: number; y: number } {
  return {
    x: gridPosition.col * cellSize,
    y: gridPosition.row * cellSize,
  };
}

/**
 * Unit Movement Animation
 * Duration: 0.3-0.5s depending on movement type
 * Effect: Smooth movement between cells
 */
export function animateUnitMovement(
  unitElement: HTMLElement,
  fromPosition: GridPosition,
  toPosition: GridPosition,
  cellSize: number,
  movementType: 'walk' | 'fly' | 'phase' | 'teleport' = 'walk'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const to = calculatePixelPosition(toPosition, cellSize);

  switch (movementType) {
    case 'walk':
      // Slight bounce while moving
      tl.to(unitElement, {
        x: to.x,
        y: to.y,
        duration: 0.4,
        ease: 'power2.inOut',
      });

      // Add slight vertical bob
      tl.to(
        unitElement,
        {
          y: `+=${-5}`,
          duration: 0.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: 1,
        },
        0
      );
      break;

    case 'fly':
      // Smooth glide with arc
      tl.to(unitElement, {
        x: to.x,
        duration: 0.5,
        ease: 'power1.inOut',
      });

      // Arc motion
      tl.to(
        unitElement,
        {
          y: to.y - 30, // Rise up
          duration: 0.25,
          ease: 'power2.out',
        },
        0
      );

      tl.to(unitElement, {
        y: to.y, // Drop down
        duration: 0.25,
        ease: 'power2.in',
      });
      break;

    case 'phase':
      // Fade out, move, fade in
      tl.to(unitElement, {
        opacity: 0.3,
        scale: 0.8,
        duration: 0.15,
        ease: 'power2.in',
      });

      tl.to(unitElement, {
        x: to.x,
        y: to.y,
        duration: 0.2,
        ease: 'none',
      });

      tl.to(unitElement, {
        opacity: 1,
        scale: 1,
        duration: 0.15,
        ease: 'power2.out',
      });
      break;

    case 'teleport':
      // Instant with effects
      tl.to(unitElement, {
        scale: 0,
        opacity: 0,
        rotation: 180,
        duration: 0.15,
        ease: 'power2.in',
      });

      tl.set(unitElement, {
        x: to.x,
        y: to.y,
      });

      tl.to(unitElement, {
        scale: 1,
        opacity: 1,
        rotation: 360,
        duration: 0.15,
        ease: 'back.out(2)',
      });
      break;
  }

  return tl;
}

/**
 * Impact/Hit Animation
 * Duration: 0.2s
 * Effect: Shake + flash red
 */
export function animateImpact(
  targetElement: HTMLElement,
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const shakeAmount = {
    light: 3,
    medium: 6,
    heavy: 10,
  }[intensity];

  // Flash red
  tl.to(targetElement, {
    filter: 'brightness(1.5) saturate(1.5)',
    duration: 0.05,
    ease: 'power2.out',
  });

  // Shake
  tl.to(
    targetElement,
    {
      x: `+=${shakeAmount}`,
      duration: 0.05,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: 3,
    },
    0
  );

  // Return to normal
  tl.to(targetElement, {
    filter: 'brightness(1) saturate(1)',
    x: 0,
    duration: 0.1,
    ease: 'power2.out',
  });

  return tl;
}

/**
 * Damage Number Animation
 * Duration: 0.8s
 * Effect: Pop in, float up, fade out
 */
export function createDamageNumber(
  amount: number,
  position: { x: number; y: number },
  type: 'damage' | 'heal' | 'critical' = 'damage',
  containerElement: HTMLElement
): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Create damage number element
  const damageNumber = document.createElement('div');
  damageNumber.className = `damage-number damage-number--${type}`;
  damageNumber.textContent = type === 'heal' ? `+${amount}` : `-${amount}`;
  damageNumber.style.position = 'absolute';
  damageNumber.style.left = `${position.x}px`;
  damageNumber.style.top = `${position.y}px`;
  damageNumber.style.fontSize = type === 'critical' ? '32px' : '24px';
  damageNumber.style.fontWeight = 'bold';
  damageNumber.style.color =
    type === 'heal' ? '#4CAF50' : type === 'critical' ? '#FF5722' : '#F44336';
  damageNumber.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.8)';
  damageNumber.style.pointerEvents = 'none';
  damageNumber.style.zIndex = '2000';

  containerElement.appendChild(damageNumber);

  // Set initial state
  gsap.set(damageNumber, {
    scale: 0,
    opacity: 0,
  });

  // Pop in with elastic bounce
  tl.to(damageNumber, {
    scale: 1,
    opacity: 1,
    duration: 0.2,
    ease: 'back.out(3)',
  });

  // Float upward
  tl.to(
    damageNumber,
    {
      y: -50,
      duration: 0.6,
      ease: 'power2.out',
    },
    0.2
  );

  // Fade out
  tl.to(damageNumber, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      damageNumber.remove();
    },
  }, 0.5);

  return tl;
}

/**
 * HP Bar Animation
 * Duration: 0.3s
 * Effect: Smooth width transition
 */
export function animateHPBar(
  hpBarElement: HTMLElement,
  currentHP: number,
  maxHP: number
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const newWidth = (currentHP / maxHP) * 100;

  // Animate HP bar
  tl.to(hpBarElement, {
    width: `${newWidth}%`,
    duration: 0.3,
    ease: 'power2.out',
  });

  // Flash if low HP
  if (currentHP / maxHP < 0.3) {
    tl.to(
      hpBarElement,
      {
        filter: 'brightness(1.5)',
        duration: 0.3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      },
      0
    );
  }

  return tl;
}

/**
 * Death Animation
 * Duration: 0.5s
 * Effect: Fade + fall + particle burst
 */
export function animateDeath(
  unitElement: HTMLElement,
  position: GridPosition,
  cellSize: number
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const pixelPos = calculatePixelPosition(position, cellSize);

  // Main death animation
  tl.to(unitElement, {
    opacity: 0,
    scale: 0.5,
    rotation: 90,
    y: `+=${20}`,
    duration: 0.5,
    ease: 'power2.in',
  });

  // Add particle burst
  tl.add(() => {
    createParticleBurst(
      { x: pixelPos.x + cellSize / 2, y: pixelPos.y + cellSize / 2 },
      unitElement.parentElement!
    );
  }, 0);

  return tl;
}

/**
 * Particle Burst Effect
 */
function createParticleBurst(
  position: { x: number; y: number },
  containerElement: HTMLElement
): void {
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'death-particle';
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = '#888';
    particle.style.pointerEvents = 'none';

    containerElement.appendChild(particle);

    // Random direction
    const angle = (Math.PI * 2 * i) / particleCount;
    const distance = 30 + Math.random() * 20;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    gsap.to(particle, {
      x: tx,
      y: ty,
      opacity: 0,
      duration: 0.5 + Math.random() * 0.3,
      ease: 'power2.out',
      onComplete: () => {
        particle.remove();
      },
    });
  }
}

/**
 * Victory Celebration
 * Duration: 1.5s
 */
export function animateVictoryCelebration(
  heroElements: HTMLElement[]
): gsap.core.Timeline {
  const tl = gsap.timeline();

  heroElements.forEach((hero, index) => {
    // Jump for joy
    tl.to(
      hero,
      {
        y: -30,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      },
      index * 0.1
    );

    // Spin
    tl.to(
      hero,
      {
        rotation: 360,
        duration: 0.6,
        ease: 'power2.inOut',
      },
      index * 0.1
    );

    // Scale pulse
    tl.to(
      hero,
      {
        scale: 1.1,
        duration: 0.3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
      },
      index * 0.1
    );
  });

  return tl;
}

/**
 * Defeat Animation
 * Duration: 1s
 */
export function animateDefeat(heroElements: HTMLElement[]): gsap.core.Timeline {
  const tl = gsap.timeline();

  heroElements.forEach((hero, index) => {
    tl.to(
      hero,
      {
        opacity: 0.3,
        scale: 0.8,
        rotation: -15,
        y: 10,
        filter: 'grayscale(100%)',
        duration: 0.5,
        ease: 'power2.in',
      },
      index * 0.1
    );
  });

  return tl;
}
