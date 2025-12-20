'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
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
  const isImageSprite = enemy.spritePath?.startsWith('/icons/');

  // Entrance animation with optional delay (skip during grid transitions)
  useEffect(() => {
    if (cardRef.current) {
      const isGridTransition = (window as any).__isGridTransition;
      const disableCardAnimations = (window as any).__disableCardAnimations;

      if (isGridTransition) {
        // During grid transitions, keep card hidden - animateGridEntrance will show it
        return;
      } else if (disableCardAnimations) {
        // During drag-and-drop updates, show card immediately without animation
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'scale(1)';
      } else {
        // Normal entrance animation
        const delay = enemy.animationDelay || 0;
        animateCardEntrance(cardRef.current, delay);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div
      ref={cardRef}
      data-grid-card
      data-unit-id={enemy.unitId}
      data-unit-type="enemy"
      className="relative w-full h-full bg-gradient-to-br from-red-900 to-red-700 border-2 border-red-400 rounded-lg overflow-hidden hover:border-red-300 transition-colors shadow-lg hover:shadow-red-500/50"
      style={{ opacity: 0, transform: 'scale(0)', fontSize: cellSize * 0.12 }}
    >
      {/* Enemy sprite - fills entire tile */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        {isImageSprite ? (
          <div className="relative w-full h-full">
            <Image
              src={enemy.spritePath!}
              alt={enemy.name}
              fill
              className="object-contain pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        ) : (
          <div
            className="text-6xl"
            style={{ fontSize: cellSize * 0.7 }}
          >
            {enemy.spritePath || '👹'}
          </div>
        )}
      </div>

      {/* HP bar only - compact overlay at bottom */}
      <div className="absolute bottom-1 left-1 right-1 z-10">
        <div className="w-full bg-black/60 rounded-full h-2 border border-red-400/50">
          <div
            className="bg-red-500 h-full rounded-full transition-all"
            style={{ width: `${hpPercentage}%` }}
          />
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
