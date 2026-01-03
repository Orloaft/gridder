'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { GridHero } from '@/types/grid.types';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridHeroCardProps {
  hero: GridHero;
  cellSize: number;
}

export function GridHeroCard({ hero, cellSize }: GridHeroCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const hpPercentage = (hero.hp / hero.maxHp) * 100;
  const cooldownPercentage = hero.cooldown ?? 0;
  const isImageSprite = hero.spritePath?.startsWith('/icons/');

  // Entrance animation with optional delay (skip during grid transitions)
  useEffect(() => {
    if (cardRef.current) {
      const isGridTransition = (window as any).__isGridTransition;
      const disableCardAnimations = (window as any).__disableCardAnimations;

      console.log(`[GridHeroCard ${hero.name}] useEffect - isGridTransition: ${isGridTransition}, disableCardAnimations: ${disableCardAnimations}`);

      if (isGridTransition) {
        // During grid transitions, keep card hidden - animateGridEntrance will show it
        console.log(`[GridHeroCard ${hero.name}] Skipping individual animation - grid transition in progress`);
        return;
      } else if (disableCardAnimations) {
        // During drag-and-drop updates, show card immediately without animation
        console.log(`[GridHeroCard ${hero.name}] Showing immediately - card animations disabled`);
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'scale(1)';
      } else {
        // Normal entrance animation
        const delay = hero.animationDelay || 0;
        console.log(`[GridHeroCard ${hero.name}] Running individual entrance animation with delay ${delay}`);
        animateCardEntrance(cardRef.current, delay);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
    // Allow drop if hero can accept hero drops OR item drops
    if (!hero.draggable && !hero.onDrop && !hero.onItemDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!hero.onDrop && !hero.onItemDrop) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Check if dropping an item
    const itemId = e.dataTransfer.getData('itemId');
    console.log('[GridHeroCard] Drop event:', {
      itemId,
      hasOnItemDrop: !!hero.onItemDrop,
      heroName: hero.name
    });

    if (itemId && hero.onItemDrop) {
      console.log('[GridHeroCard] Calling onItemDrop with itemId:', itemId);
      hero.onItemDrop(itemId);
      return;
    }

    // Check if dropping a hero (for team reordering)
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
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 border-2 ${isDragOver ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-blue-400'} rounded-lg overflow-hidden hover:border-blue-300 transition-colors shadow-lg hover:shadow-blue-500/50 ${hero.draggable ? 'cursor-move' : ''} ${hero.onClick ? 'cursor-pointer' : ''}`}
      style={{ opacity: 0, transform: 'scale(0)', fontSize: cellSize * 0.12 }}
    >
      {/* Hero sprite - fills entire tile */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        {isImageSprite ? (
          <div className="relative w-full h-full">
            <Image
              src={hero.spritePath!}
              alt={hero.name}
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
            {hero.spritePath || '🛡️'}
          </div>
        )}
      </div>

      {/* HP bar only - compact overlay at bottom */}
      <div className="absolute bottom-1 left-1 right-1 z-10">
        <div className="w-full bg-black/60 rounded-full h-2 border border-blue-400/50">
          <div
            className="bg-green-500 h-full rounded-full transition-all"
            style={{ width: `${hpPercentage}%` }}
          />
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

      {/* Lock overlay - shows when hero is locked */}
      {hero.locked && (
        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center">
          <div className="text-4xl mb-2">🔒</div>
          {hero.lockCost && (
            <div className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded border border-yellow-500">
              {hero.lockCost} {hero.lockCurrency === 'gems' ? '💎' : '💰'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
