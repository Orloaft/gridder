'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { GridResource } from '@/types/grid.types';
import { generateResourceIcon } from '@/utils/generatePlaceholder';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridResourceCardProps {
  resource: GridResource;
  cellSize: number;
}

export function GridResourceCard({ resource, cellSize }: GridResourceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const resourceConfig = {
    gold: { color: 'from-yellow-600 to-yellow-800', border: 'border-yellow-400' },
    gems: { color: 'from-cyan-600 to-cyan-800', border: 'border-cyan-400' },
    experience: { color: 'from-purple-600 to-purple-800', border: 'border-purple-400' },
  };

  const config = resourceConfig[resource.resourceType];
  const iconPath = resource.icon || generateResourceIcon(resource.resourceType);
  const isImageIcon = iconPath.startsWith('/icons/');

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
        const delay = resource.animationDelay || 0;
        animateCardEntrance(cardRef.current, delay);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div
      ref={cardRef}
      data-grid-card
      className={`relative w-full h-full bg-gradient-to-br ${config.color} border-2 ${config.border} rounded-lg overflow-hidden shadow-lg`}
      style={{ opacity: 0, transform: 'scale(0)' }}
    >
      {/* Icon fills entire tile */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isImageIcon ? (
          <div className="relative w-full h-full">
            <Image
              src={iconPath}
              alt={resource.resourceType}
              fill
              className="object-contain pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        ) : (
          <div style={{ fontSize: cellSize * 0.7 }}>{iconPath}</div>
        )}
      </div>
    </div>
  );
}
