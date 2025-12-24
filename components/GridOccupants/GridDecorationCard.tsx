'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { GridDecoration } from '@/types/grid.types';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridDecorationCardProps {
  decoration: GridDecoration;
  cellSize: number;
}

export function GridDecorationCard({ decoration, cellSize }: GridDecorationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isImageSprite = decoration.spritePath?.startsWith('/icons/');

  const styleConfig: Record<string, { fontSize: number; fontWeight: string; className: string }> = {
    title: {
      fontSize: cellSize * 0.25,
      fontWeight: 'bold',
      className: 'text-white drop-shadow-lg',
    },
    subtitle: {
      fontSize: cellSize * 0.15,
      fontWeight: 'semibold',
      className: 'text-white drop-shadow-md',
    },
    banner: {
      fontSize: cellSize * 0.13,
      fontWeight: 'normal',
      className: 'text-gray-200 bg-black/40 p-2 rounded',
    },
    flash: {
      fontSize: cellSize * 0.2,
      fontWeight: 'bold',
      className: 'text-yellow-300 drop-shadow-lg animate-pulse',
    },
    icon: {
      fontSize: cellSize * 0.3,
      fontWeight: 'normal',
      className: 'text-white',
    },
    chest: {
      fontSize: cellSize * 0.5,
      fontWeight: 'normal',
      className: 'text-white',
    },
    legendary: {
      fontSize: cellSize * 0.2,
      fontWeight: 'bold',
      className: 'text-yellow-400 drop-shadow-lg animate-pulse',
    },
    'slot-machine': {
      fontSize: cellSize * 0.3,
      fontWeight: 'bold',
      className: 'text-white animate-pulse',
    },
    particle: {
      fontSize: cellSize * 0.15,
      fontWeight: 'normal',
      className: 'text-white opacity-80',
    },
  };

  const style = decoration.style || 'title';
  const config = styleConfig[style] || styleConfig.title; // Fallback to title if style not found

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
        const delay = decoration.animationDelay || 0;
        animateCardEntrance(cardRef.current, delay);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div
      ref={cardRef}
      data-grid-card
      className="relative w-full h-full bg-gradient-to-br from-purple-900 to-purple-700 border-2 border-purple-400 rounded-lg overflow-hidden shadow-lg"
      style={{ opacity: 0, transform: 'scale(0)', fontSize: cellSize * 0.12 }}
    >
      {/* Image sprite - fills entire tile background */}
      {decoration.spritePath && (
        <div className="absolute inset-0 flex items-center justify-center z-0">
          {isImageSprite ? (
            <div className="relative w-full h-full">
              <Image
                src={decoration.spritePath}
                alt=""
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
              {decoration.spritePath}
            </div>
          )}
        </div>
      )}

      {/* Text overlay at bottom */}
      {decoration.text && (
        <div className="absolute bottom-1 left-1 right-1 z-10 text-center">
          <div
            className={`${config.className} bg-black/60 rounded px-2 py-1 border border-purple-400/50`}
            style={{
              fontSize: config.fontSize,
              fontWeight: config.fontWeight,
            }}
          >
            {decoration.text}
          </div>
        </div>
      )}
    </div>
  );
}
