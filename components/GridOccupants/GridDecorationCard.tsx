'use client';

import React, { useRef, useEffect } from 'react';
import { GridDecoration } from '@/types/grid.types';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridDecorationCardProps {
  decoration: GridDecoration;
  cellSize: number;
}

export function GridDecorationCard({ decoration, cellSize }: GridDecorationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const styleConfig = {
    title: {
      fontSize: cellSize * 0.25,
      fontWeight: 'bold',
      className: 'text-white drop-shadow-lg',
    },
    subtitle: {
      fontSize: cellSize * 0.15,
      fontWeight: 'semibold',
      className: 'text-gray-300',
    },
    banner: {
      fontSize: cellSize * 0.13,
      fontWeight: 'normal',
      className: 'text-gray-200 bg-black/40 p-2 rounded',
    },
  };

  const style = decoration.style || 'title';
  const config = styleConfig[style];

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
      className="relative w-full h-full flex items-center justify-center text-center p-1"
      style={{ opacity: 0, transform: 'scale(0)' }}
    >
      {decoration.spritePath ? (
        <div style={{ fontSize: cellSize * 0.7 }}>
          {decoration.spritePath}
        </div>
      ) : decoration.text ? (
        <div
          className={config.className}
          style={{
            fontSize: config.fontSize,
            fontWeight: config.fontWeight,
          }}
        >
          {decoration.text}
        </div>
      ) : null}
    </div>
  );
}
