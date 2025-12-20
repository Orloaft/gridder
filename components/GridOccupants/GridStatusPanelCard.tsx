'use client';

import React, { useRef, useEffect } from 'react';
import { GridStatusPanel } from '@/types/grid.types';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridStatusPanelCardProps {
  statusPanel: GridStatusPanel;
  cellSize: number;
}

export function GridStatusPanelCard({ statusPanel, cellSize }: GridStatusPanelCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const variantStyles = {
    info: 'from-blue-700 to-blue-900 border-blue-500',
    warning: 'from-yellow-700 to-yellow-900 border-yellow-500',
    success: 'from-green-700 to-green-900 border-green-500',
  };

  const variant = statusPanel.variant || 'info';
  const baseStyles = variantStyles[variant];

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
        const delay = statusPanel.animationDelay || 0;
        animateCardEntrance(cardRef.current, delay);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div
      ref={cardRef}
      data-grid-card
      className={`relative w-full h-full bg-gradient-to-br ${baseStyles} border-2 rounded-lg overflow-hidden p-2`}
      style={{ opacity: 0, transform: 'scale(0)' }}
    >
      {/* Title */}
      <div
        className="text-white font-bold truncate"
        style={{ fontSize: cellSize * 0.14 }}
      >
        {statusPanel.title}
      </div>

      {/* Content */}
      <div
        className="text-gray-200 mt-1 overflow-hidden"
        style={{
          fontSize: cellSize * 0.11,
          maxHeight: cellSize * 0.6,
        }}
      >
        {statusPanel.content}
      </div>
    </div>
  );
}
