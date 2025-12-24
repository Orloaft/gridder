'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { GridItem } from '@/types/grid.types';
import { getRarityColor } from '@/utils/lootGenerator';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridItemCardProps {
  item: GridItem;
  cellSize: number;
}

export function GridItemCard({ item, cellSize }: GridItemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Get rarity color
  const rarityColor = getRarityColor(item.rarity as any);

  const isImageIcon = item.icon.startsWith('/icons/');

  // Entrance animation with optional delay
  useEffect(() => {
    if (cardRef.current) {
      const isGridTransition = (window as any).__isGridTransition;
      const disableCardAnimations = (window as any).__disableCardAnimations;

      if (isGridTransition) {
        // During grid transitions, keep card hidden
        return;
      } else if (disableCardAnimations) {
        // Show card immediately without animation
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'scale(1)';
      } else {
        // Normal entrance animation
        const delay = item.animationDelay || 0;
        animateCardEntrance(cardRef.current, delay);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div
      ref={cardRef}
      data-grid-card
      className={`relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-transform`}
      style={{
        opacity: 0,
        transform: 'scale(0)',
        borderColor: rarityColor,
      }}
      onClick={item.onClick}
    >
      {/* Icon fills entire tile */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isImageIcon ? (
          <div className="relative w-full h-full">
            <Image
              src={item.icon}
              alt={item.name}
              fill
              className="object-contain pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        ) : (
          <div style={{ fontSize: cellSize * 0.6 }}>{item.icon}</div>
        )}
      </div>

      {/* Name display at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-0.5">
        <div
          className="font-bold text-white text-center truncate"
          style={{ fontSize: cellSize * 0.12, color: rarityColor }}
        >
          {item.name}
        </div>
      </div>

      {/* Rarity glow effect */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${rarityColor} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
