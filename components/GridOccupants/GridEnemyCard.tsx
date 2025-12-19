'use client';

import React, { useRef, useEffect } from 'react';
import { GridEnemy } from '@/types/grid.types';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridEnemyCardProps {
  enemy: GridEnemy;
  cellSize: number;
}

export function GridEnemyCard({ enemy, cellSize }: GridEnemyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hpPercentage = (enemy.hp / enemy.maxHp) * 100;
  const cooldownPercentage = enemy.cooldown ?? 0;

  // Entrance animation with optional delay (skip during grid transitions)
  useEffect(() => {
    if (cardRef.current && !(window as any).__disableCardAnimations) {
      const delay = enemy.animationDelay || 0;
      animateCardEntrance(cardRef.current, delay);
    }
  }, [enemy.animationDelay]);

  return (
    <div
      ref={cardRef}
      data-grid-card
      data-unit-id={enemy.unitId}
      data-unit-type="enemy"
      className="relative w-full h-full bg-gradient-to-br from-red-900 to-red-700 border-2 border-red-400 rounded-lg overflow-hidden hover:border-red-300 transition-all shadow-lg hover:shadow-red-500/50"
      style={{ opacity: 0, transform: 'scale(0)', fontSize: cellSize * 0.12 }}
    >
      {/* Enemy sprite placeholder */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div
          className="text-4xl"
          style={{ fontSize: cellSize * 0.4 }}
        >
          {enemy.spritePath || '👹'}
        </div>
      </div>

      {/* Enemy info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 z-0">
        <div className="text-white font-bold truncate" style={{ fontSize: cellSize * 0.12 }}>
          {enemy.name}
        </div>

        {/* HP bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-0.5">
          <div
            className="bg-red-500 h-full rounded-full transition-all"
            style={{ width: `${hpPercentage}%` }}
          />
        </div>

        <div className="text-gray-300 text-xs" style={{ fontSize: cellSize * 0.1 }}>
          {enemy.hp}/{enemy.maxHp}
        </div>
      </div>

      {/* Cooldown overlay - dark overlay that recedes from bottom to top as cooldown fills */}
      {enemy.cooldown !== undefined && (
        <div
          className="absolute inset-0 bg-black/70 pointer-events-none transition-all duration-200 z-10"
          style={{
            height: `${100 - cooldownPercentage}%`,
            top: 'auto',
            bottom: 0
          }}
        />
      )}
    </div>
  );
}
