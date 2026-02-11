import { GridPosition } from '@/types/grid.types';

/** Chebyshev distance (allows diagonal movement at cost 1) */
export function getDistance(a: GridPosition, b: GridPosition): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/** Position key for Map lookups */
export function posKey(pos: GridPosition): string {
  return `${pos.row},${pos.col}`;
}

interface Positioned {
  position: GridPosition;
}

/** Find the closest target from a list of positioned entities */
export function findClosest<T extends Positioned>(
  origin: GridPosition,
  targets: T[]
): T | null {
  if (targets.length === 0) return null;

  let closest = targets[0];
  let minDist = getDistance(origin, closest.position);

  for (const target of targets) {
    const dist = getDistance(origin, target.position);
    if (dist < minDist) {
      minDist = dist;
      closest = target;
    }
  }

  return closest;
}

/** Filter targets within a given range from origin */
export function getInRange<T extends Positioned>(
  origin: GridPosition,
  range: number,
  targets: T[]
): T[] {
  return targets.filter(t => getDistance(origin, t.position) <= range);
}

/** Find the target with the lowest HP */
export function findLowestHp<T extends { stats: { hp: number } }>(
  targets: T[]
): T | null {
  if (targets.length === 0) return null;

  let lowest = targets[0];
  for (const t of targets) {
    if (t.stats.hp < lowest.stats.hp) {
      lowest = t;
    }
  }
  return lowest;
}
