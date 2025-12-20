// Skill/Ability animation utilities using GSAP
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
 * Cleave/Slash Animation
 * Duration: 0.6s
 * Effect: Sweeping arc slash motion with trail effect
 */
export function animateCleave(
  casterElement: HTMLElement,
  targetPositions: GridPosition[],
  casterPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement
): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Wind-up motion
  tl.to(casterElement, {
    rotation: -15,
    scale: 1.1,
    duration: 0.15,
    ease: 'power2.out',
  });

  // Create slash effect element
  const slashEffect = document.createElement('div');
  slashEffect.className = 'skill-slash-effect';
  slashEffect.style.position = 'absolute';
  slashEffect.style.width = `${cellSize * 2}px`;
  slashEffect.style.height = `${cellSize * 2}px`;

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);
  slashEffect.style.left = `${casterPixelPos.x - cellSize / 2}px`;
  slashEffect.style.top = `${casterPixelPos.y - cellSize / 2}px`;
  slashEffect.style.pointerEvents = 'none';
  slashEffect.style.zIndex = '1500';

  // Create arc/slash visual
  slashEffect.innerHTML = `
    <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
      <path d="M 10 50 Q 50 10, 90 50" stroke="#FFD700" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.8" />
      <path d="M 10 50 Q 50 10, 90 50" stroke="#FFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.6" />
    </svg>
  `;

  containerElement.appendChild(slashEffect);
  gsap.set(slashEffect, { opacity: 0, scale: 0.5, rotation: -45 });

  // Slash motion
  tl.to(casterElement, {
    rotation: 30,
    duration: 0.25,
    ease: 'power4.out',
  });

  // Slash effect appears and sweeps
  tl.to(
    slashEffect,
    {
      opacity: 1,
      scale: 1.5,
      rotation: 45,
      duration: 0.25,
      ease: 'power2.out',
    },
    '-=0.25'
  );

  // Create particle trails for each target hit
  targetPositions.forEach((targetPos, index) => {
    const targetPixelPos = calculatePixelPosition(targetPos, cellSize);
    tl.add(() => {
      createSlashParticles(
        { x: targetPixelPos.x + cellSize / 2, y: targetPixelPos.y + cellSize / 2 },
        containerElement
      );
    }, 0.15 + index * 0.05);
  });

  // Fade out slash effect
  tl.to(slashEffect, {
    opacity: 0,
    scale: 2,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => {
      slashEffect.remove();
    },
  });

  // Return caster to normal
  tl.to(
    casterElement,
    {
      rotation: 0,
      scale: 1,
      duration: 0.2,
      ease: 'back.out(2)',
    },
    '-=0.1'
  );

  return tl;
}

/**
 * Fireball/Projectile Animation
 * Duration: 0.8s
 * Effect: Projectile travels from caster to target with explosion
 */
export function animateFireball(
  casterElement: HTMLElement,
  targetElement: HTMLElement,
  casterPosition: GridPosition,
  targetPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);
  const targetPixelPos = calculatePixelPosition(targetPosition, cellSize);

  // Charge-up motion
  tl.to(casterElement, {
    scale: 1.15,
    filter: 'brightness(1.3) saturate(1.5)',
    duration: 0.2,
    ease: 'power2.out',
  });

  // Create fireball projectile
  const fireball = document.createElement('div');
  fireball.className = 'skill-fireball';
  fireball.style.position = 'absolute';
  fireball.style.width = `${cellSize * 0.4}px`;
  fireball.style.height = `${cellSize * 0.4}px`;
  fireball.style.left = `${casterPixelPos.x + cellSize / 2}px`;
  fireball.style.top = `${casterPixelPos.y + cellSize / 2}px`;
  fireball.style.borderRadius = '50%';
  fireball.style.background = 'radial-gradient(circle, #FFF 0%, #FF4500 40%, #8B0000 100%)';
  fireball.style.boxShadow = '0 0 20px #FF4500, 0 0 40px #FF4500';
  fireball.style.pointerEvents = 'none';
  fireball.style.zIndex = '1500';

  containerElement.appendChild(fireball);

  // Launch fireball
  tl.to(fireball, {
    x: targetPixelPos.x + cellSize / 2 - (casterPixelPos.x + cellSize / 2),
    y: targetPixelPos.y + cellSize / 2 - (casterPixelPos.y + cellSize / 2),
    duration: 0.4,
    ease: 'power1.inOut',
    onUpdate: function() {
      // Create trail particles
      if (Math.random() > 0.7) {
        createFireTrail(
          {
            x: parseFloat(fireball.style.left) + parseFloat(gsap.getProperty(fireball, 'x') as string),
            y: parseFloat(fireball.style.top) + parseFloat(gsap.getProperty(fireball, 'y') as string),
          },
          containerElement
        );
      }
    },
  });

  // Caster returns to normal
  tl.to(
    casterElement,
    {
      scale: 1,
      filter: 'brightness(1) saturate(1)',
      duration: 0.2,
      ease: 'power2.in',
    },
    '-=0.3'
  );

  // Impact explosion
  tl.add(() => {
    fireball.remove();
    createFireExplosion(
      { x: targetPixelPos.x + cellSize / 2, y: targetPixelPos.y + cellSize / 2 },
      containerElement,
      cellSize
    );
  });

  return tl;
}

/**
 * Buff/Support Animation
 * Duration: 0.6s
 * Effect: Radial wave effect emanating from caster
 */
export function animateBuff(
  casterElement: HTMLElement,
  affectedElements: HTMLElement[],
  casterPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  buffColor: string = '#4CAF50'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);

  // Caster raises hands
  tl.to(casterElement, {
    y: -10,
    scale: 1.1,
    filter: `drop-shadow(0 0 10px ${buffColor})`,
    duration: 0.3,
    ease: 'power2.out',
  });

  // Create multiple expanding rings
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.className = 'skill-buff-ring';
    ring.style.position = 'absolute';
    ring.style.width = `${cellSize}px`;
    ring.style.height = `${cellSize}px`;
    ring.style.left = `${casterPixelPos.x + cellSize / 2}px`;
    ring.style.top = `${casterPixelPos.y + cellSize / 2}px`;
    ring.style.borderRadius = '50%';
    ring.style.border = `3px solid ${buffColor}`;
    ring.style.pointerEvents = 'none';
    ring.style.zIndex = '1500';
    ring.style.transform = 'translate(-50%, -50%)';

    containerElement.appendChild(ring);
    gsap.set(ring, { opacity: 0.8, scale: 0.5 });

    // Expand and fade
    tl.to(
      ring,
      {
        scale: 3,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          ring.remove();
        },
      },
      i * 0.1
    );
  }

  // Affected units glow and pulse
  affectedElements.forEach((element, index) => {
    tl.to(
      element,
      {
        filter: `drop-shadow(0 0 10px ${buffColor}) brightness(1.2)`,
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      },
      0.3 + index * 0.05
    );

    // Sparkles around buffed units
    tl.add(() => {
      createBuffSparkles(element, containerElement, buffColor);
    }, 0.3 + index * 0.05);
  });

  // Caster returns to normal
  tl.to(
    casterElement,
    {
      y: 0,
      scale: 1,
      filter: 'none',
      duration: 0.2,
      ease: 'power2.in',
    },
    '-=0.2'
  );

  return tl;
}

// Helper: Create slash particles
function createSlashParticles(
  position: { x: number; y: number },
  containerElement: HTMLElement
): void {
  const particleCount = 8;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '6px';
    particle.style.height = '6px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = '#FFD700';
    particle.style.boxShadow = '0 0 4px #FFD700';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1600';

    containerElement.appendChild(particle);

    const angle = (Math.PI * 2 * i) / particleCount;
    const distance = 20 + Math.random() * 20;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

// Helper: Create fire trail
function createFireTrail(
  position: { x: number; y: number },
  containerElement: HTMLElement
): void {
  const trail = document.createElement('div');
  trail.style.position = 'absolute';
  trail.style.left = `${position.x}px`;
  trail.style.top = `${position.y}px`;
  trail.style.width = '8px';
  trail.style.height = '8px';
  trail.style.borderRadius = '50%';
  trail.style.background = 'radial-gradient(circle, #FFF 0%, #FF4500 50%, transparent 100%)';
  trail.style.pointerEvents = 'none';
  trail.style.zIndex = '1400';

  containerElement.appendChild(trail);

  gsap.to(trail, {
    scale: 0.5,
    opacity: 0,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => trail.remove(),
  });
}

// Helper: Create fire explosion
function createFireExplosion(
  position: { x: number; y: number },
  containerElement: HTMLElement,
  cellSize: number
): void {
  const explosion = document.createElement('div');
  explosion.style.position = 'absolute';
  explosion.style.left = `${position.x}px`;
  explosion.style.top = `${position.y}px`;
  explosion.style.width = `${cellSize}px`;
  explosion.style.height = `${cellSize}px`;
  explosion.style.borderRadius = '50%';
  explosion.style.background = 'radial-gradient(circle, #FFF 0%, #FF4500 30%, #8B0000 60%, transparent 100%)';
  explosion.style.boxShadow = '0 0 40px #FF4500';
  explosion.style.pointerEvents = 'none';
  explosion.style.zIndex = '1600';
  explosion.style.transform = 'translate(-50%, -50%)';

  containerElement.appendChild(explosion);

  gsap.fromTo(
    explosion,
    { scale: 0, opacity: 1 },
    {
      scale: 2,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => explosion.remove(),
    }
  );

  // Explosion particles
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = i % 2 === 0 ? '#FF4500' : '#FFD700';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1600';

    containerElement.appendChild(particle);

    const angle = (Math.PI * 2 * i) / 12;
    const distance = 30 + Math.random() * 20;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

// Helper: Create buff sparkles
function createBuffSparkles(
  element: HTMLElement,
  containerElement: HTMLElement,
  color: string
): void {
  const rect = element.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const sparkle = document.createElement('div');
      sparkle.style.position = 'absolute';
      sparkle.style.left = `${rect.left - containerRect.left + Math.random() * rect.width}px`;
      sparkle.style.top = `${rect.top - containerRect.top + Math.random() * rect.height}px`;
      sparkle.style.width = '4px';
      sparkle.style.height = '4px';
      sparkle.style.borderRadius = '50%';
      sparkle.style.backgroundColor = color;
      sparkle.style.boxShadow = `0 0 6px ${color}`;
      sparkle.style.pointerEvents = 'none';
      sparkle.style.zIndex = '1600';

      containerElement.appendChild(sparkle);

      gsap.fromTo(
        sparkle,
        { scale: 0, opacity: 1, y: 0 },
        {
          scale: 1,
          opacity: 0,
          y: -20,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => sparkle.remove(),
        }
      );
    }, i * 100);
  }
}
