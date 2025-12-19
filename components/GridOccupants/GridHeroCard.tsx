'use client';

import React, { useRef, useEffect } from 'react';
import { GridHero } from '@/types/grid.types';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridHeroCardProps {
  hero: GridHero;
  cellSize: number;
}

export function GridHeroCard({ hero, cellSize }: GridHeroCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hpPercentage = (hero.hp / hero.maxHp) * 100;
  const cooldownPercentage = hero.cooldown ?? 0;

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
        const delay = hero.animationDelay || 0;
        animateCardEntrance(cardRef.current, delay);
      }
    }
  }, [hero.animationDelay]);

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!hero.draggable) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('heroId', hero.heroInstanceId || '');
    if (hero.onDragStart) {
      hero.onDragStart();
    }
    // Add dragging visual feedback
    if (cardRef.current) {
      cardRef.current.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!hero.draggable && !hero.onDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedHeroId = e.dataTransfer.getData('heroId');
    if (droppedHeroId && hero.onDrop) {
      hero.onDrop(droppedHeroId);
    }
  };

  const handleClick = () => {
    if (hero.onClick) {
      hero.onClick();
    }
  };

  return (
    <div
      ref={cardRef}
      data-grid-card
      data-unit-id={hero.unitId}
      data-unit-type="hero"
      draggable={hero.draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 border-2 border-blue-400 rounded-lg overflow-hidden hover:border-blue-300 transition-all shadow-lg hover:shadow-blue-500/50 ${hero.draggable ? 'cursor-move' : ''} ${hero.onClick ? 'cursor-pointer' : ''}`}
      style={{ opacity: 0, transform: 'scale(0)', fontSize: cellSize * 0.12 }}
    >
      {/* Hero sprite placeholder */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div
          className="text-4xl"
          style={{ fontSize: cellSize * 0.4 }}
        >
          {hero.spritePath || '🛡️'}
        </div>
      </div>

      {/* Hero info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 z-0">
        <div className="text-white font-bold truncate" style={{ fontSize: cellSize * 0.12 }}>
          {hero.name}
        </div>

        {/* HP bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-0.5">
          <div
            className="bg-green-500 h-full rounded-full transition-all"
            style={{ width: `${hpPercentage}%` }}
          />
        </div>

        <div className="text-gray-300 text-xs" style={{ fontSize: cellSize * 0.1 }}>
          Lv.{hero.level} • {hero.hp}/{hero.maxHp}
        </div>
      </div>

      {/* Cooldown overlay - dark overlay that recedes from bottom to top as cooldown fills */}
      {hero.cooldown !== undefined && (
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
