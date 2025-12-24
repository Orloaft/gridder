import { GridPosition } from '@/types/grid.types';

export type ParticleType =
  | 'sparkle'
  | 'coin'
  | 'gem'
  | 'explosion'
  | 'confetti'
  | 'smoke'
  | 'glow'
  | 'spiral';

export interface Particle {
  id: string;
  type: ParticleType;
  position: GridPosition;
  velocity: { row: number; col: number };
  lifetime: number; // milliseconds
  createdAt: number;
  scale: number;
  rotation: number;
  opacity: number;
  color?: string;
  icon?: string;
}

export interface ParticleEmitterConfig {
  position: GridPosition;
  type: ParticleType;
  count: number;
  lifetime: number;
  velocityRange: {
    rowMin: number;
    rowMax: number;
    colMin: number;
    colMax: number;
  };
  scaleRange?: { min: number; max: number };
  color?: string;
  icon?: string;
}

/**
 * ParticleManager: Grid-based particle system for visual effects
 *
 * Manages lightweight particle animations that occupy grid tiles.
 * Enforces particle budget (max 100 concurrent particles) for performance.
 */
export class ParticleManager {
  private particles: Map<string, Particle> = new Map();
  private nextId: number = 0;
  private maxParticles: number = 100;

  /**
   * Emit particles from a position
   */
  public emit(config: ParticleEmitterConfig): void {
    const now = Date.now();

    for (let i = 0; i < config.count; i++) {
      // Stop if we hit particle budget
      if (this.particles.size >= this.maxParticles) {
        console.warn('[ParticleManager] Hit particle budget, stopping emission');
        break;
      }

      const particle: Particle = {
        id: `particle-${this.nextId++}`,
        type: config.type,
        position: { ...config.position },
        velocity: {
          row: this.randomRange(config.velocityRange.rowMin, config.velocityRange.rowMax),
          col: this.randomRange(config.velocityRange.colMin, config.velocityRange.colMax),
        },
        lifetime: config.lifetime,
        createdAt: now,
        scale: config.scaleRange
          ? this.randomRange(config.scaleRange.min, config.scaleRange.max)
          : 1.0,
        rotation: Math.random() * 360,
        opacity: 1.0,
        color: config.color,
        icon: config.icon,
      };

      this.particles.set(particle.id, particle);
    }
  }

  /**
   * Update all particles (call every frame)
   * Returns particles that have changed position or died
   */
  public update(deltaTime: number): {
    updated: Particle[];
    died: string[];
  } {
    const now = Date.now();
    const updated: Particle[] = [];
    const died: string[] = [];

    this.particles.forEach((particle, id) => {
      const age = now - particle.createdAt;

      // Check if particle should die
      if (age >= particle.lifetime) {
        died.push(id);
        this.particles.delete(id);
        return;
      }

      // Update position based on velocity
      particle.position.row += particle.velocity.row * (deltaTime / 1000);
      particle.position.col += particle.velocity.col * (deltaTime / 1000);

      // Update opacity (fade out near end of lifetime)
      const lifePercent = age / particle.lifetime;
      if (lifePercent > 0.7) {
        particle.opacity = 1.0 - ((lifePercent - 0.7) / 0.3);
      }

      // Update rotation
      particle.rotation += 90 * (deltaTime / 1000); // 90 degrees per second

      updated.push(particle);
    });

    return { updated, died };
  }

  /**
   * Get all active particles
   */
  public getParticles(): Particle[] {
    return Array.from(this.particles.values());
  }

  /**
   * Clear all particles
   */
  public clear(): void {
    this.particles.clear();
  }

  /**
   * Get particle count
   */
  public getCount(): number {
    return this.particles.size;
  }

  /**
   * Preset: Coin drop effect
   */
  public emitCoinDrop(position: GridPosition, count: number = 5): void {
    this.emit({
      position,
      type: 'coin',
      count,
      lifetime: 1000,
      velocityRange: {
        rowMin: -2,
        rowMax: 2,
        colMin: -2,
        colMax: 2,
      },
      scaleRange: { min: 0.5, max: 1.0 },
      icon: '🪙',
    });
  }

  /**
   * Preset: Gem spiral effect
   */
  public emitGemSpiral(position: GridPosition, count: number = 8): void {
    const angleStep = (Math.PI * 2) / count;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const angle = angleStep * i;
      const speed = 3;

      const particle: Particle = {
        id: `particle-${this.nextId++}`,
        type: 'gem',
        position: { ...position },
        velocity: {
          row: Math.sin(angle) * speed,
          col: Math.cos(angle) * speed,
        },
        lifetime: 1500,
        createdAt: now,
        scale: 0.8,
        rotation: 0,
        opacity: 1.0,
        icon: '💎',
      };

      this.particles.set(particle.id, particle);
    }
  }

  /**
   * Preset: Confetti explosion
   */
  public emitConfetti(position: GridPosition, count: number = 20): void {
    this.emit({
      position,
      type: 'confetti',
      count,
      lifetime: 2000,
      velocityRange: {
        rowMin: -3,
        rowMax: -1,
        colMin: -3,
        colMax: 3,
      },
      scaleRange: { min: 0.3, max: 0.7 },
    });
  }

  /**
   * Preset: Sparkle effect
   */
  public emitSparkles(position: GridPosition, count: number = 10): void {
    this.emit({
      position,
      type: 'sparkle',
      count,
      lifetime: 800,
      velocityRange: {
        rowMin: -1,
        rowMax: 1,
        colMin: -1,
        colMax: 1,
      },
      scaleRange: { min: 0.5, max: 1.2 },
      icon: '✨',
    });
  }

  /**
   * Preset: Rainbow particles (legendary reveal)
   */
  public emitRainbow(position: GridPosition, count: number = 30): void {
    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];

    for (let i = 0; i < count; i++) {
      this.emit({
        position,
        type: 'glow',
        count: 1,
        lifetime: 2000,
        velocityRange: {
          rowMin: -4,
          rowMax: 4,
          colMin: -4,
          colMax: 4,
        },
        scaleRange: { min: 0.5, max: 1.5 },
        color: colors[i % colors.length],
        icon: '⭐',
      });
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
